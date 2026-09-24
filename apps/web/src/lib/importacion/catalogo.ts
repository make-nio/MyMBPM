import { generarCsv } from "../csv";
import { FilaImportacionCatalogo } from "../../types/importacion-catalogo";

// Columnas de la plantilla. El nombre es lo que se ve en el archivo; la clave, lo que espera la
// API. Al leer se ignoran mayusculas, acentos y espacios de mas.
export const COLUMNAS_CATALOGO: Array<{ clave: keyof FilaImportacionCatalogo; nombre: string; obligatoria?: boolean }> = [
  { clave: "nombre", nombre: "Nombre", obligatoria: true },
  { clave: "tipo", nombre: "Tipo", obligatoria: true },
  { clave: "categoria", nombre: "Categoria", obligatoria: true },
  { clave: "codigo", nombre: "Codigo" },
  { clave: "precio", nombre: "Precio" },
  { clave: "costo", nombre: "Costo" },
  { clave: "stockMinimo", nombre: "Stock minimo" },
  { clave: "material", nombre: "Material" },
  { clave: "color", nombre: "Color" },
  { clave: "descripcionCorta", nombre: "Descripcion corta" },
  { clave: "activo", nombre: "Activo" }
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function plantillaCatalogo() {
  return generarCsv(
    COLUMNAS_CATALOGO.map((columna) => columna.nombre),
    [
      ["Maceta cubo 10 cm", "Producto", "Macetas", "MAC-10", "3500", "1200", "5", "PLA", "Blanco", "Maceta con desague", "Si"],
      ["Filamento PLA 1 kg", "Insumo", "Filamentos", "PLA-1KG", "", "18000", "2", "PLA", "Negro", "", "Si"]
    ]
  );
}

// Pasa la tabla del CSV (con encabezado) a las filas que espera la API. Las columnas se buscan por
// nombre, en cualquier orden; las que no se reconocen se ignoran.
export function mapearFilasCatalogo(tabla: string[][]) {
  const [encabezado = [], ...datos] = tabla;
  const indices = new Map(encabezado.map((nombre, indice) => [normalizar(nombre), indice]));
  const faltantes = COLUMNAS_CATALOGO.filter(
    (columna) => columna.obligatoria && !indices.has(normalizar(columna.nombre))
  ).map((columna) => columna.nombre);

  const filas = datos.map((celdas) => {
    const fila: FilaImportacionCatalogo = {};
    for (const columna of COLUMNAS_CATALOGO) {
      const indice = indices.get(normalizar(columna.nombre));
      if (indice !== undefined) {
        fila[columna.clave] = celdas[indice] ?? "";
      }
    }
    return fila;
  });

  return { filas, faltantes };
}
