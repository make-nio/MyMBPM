// Una fila del CSV como texto, sin convertir: la valida la API.
export type FilaImportacionCatalogo = Partial<
  Record<
    | "nombre"
    | "tipo"
    | "categoria"
    | "codigo"
    | "precio"
    | "costo"
    | "stockMinimo"
    | "material"
    | "color"
    | "descripcionCorta"
    | "activo",
    string
  >
>;

export type FilaValidadaCatalogo = {
  numero: number;
  errores: string[];
  item: { nombre: string; tipoItem: string; categoria: string } | null;
};

export type PrevisualizacionCatalogo = {
  filas: FilaValidadaCatalogo[];
  resumen: { total: number; validas: number; conErrores: number; categoriasNuevas: string[] };
};

export type ResultadoImportacionCatalogo = { creados: number; categoriasCreadas: string[] };
