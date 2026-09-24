// Columnas de una plantilla de importacion. El nombre es lo que se ve en el archivo; la clave, lo
// que espera la API. Al leer se ignoran mayusculas, acentos y espacios de mas.
export type ColumnaImportacion<Clave extends string> = { clave: Clave; nombre: string; obligatoria?: boolean };

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Pasa la tabla del CSV (con encabezado) a las filas que espera la API. Las columnas se buscan por
// nombre, en cualquier orden; las que no se reconocen se ignoran.
export function mapearFilas<Clave extends string>(tabla: string[][], columnas: Array<ColumnaImportacion<Clave>>) {
  const [encabezado = [], ...datos] = tabla;
  const indices = new Map(encabezado.map((nombre, indice) => [normalizar(nombre), indice]));
  const faltantes = columnas
    .filter((columna) => columna.obligatoria && !indices.has(normalizar(columna.nombre)))
    .map((columna) => columna.nombre);

  const filas = datos.map((celdas) => {
    const fila: Partial<Record<Clave, string>> = {};
    for (const columna of columnas) {
      const indice = indices.get(normalizar(columna.nombre));
      if (indice !== undefined) {
        fila[columna.clave] = celdas[indice] ?? "";
      }
    }
    return fila;
  });

  return { filas, faltantes };
}
