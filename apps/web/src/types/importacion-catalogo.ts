import type { RespuestaDe } from "@contrato";

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

// Respuestas: sacadas del contrato de la API (apps/api/src/contrato).
export type PrevisualizacionCatalogo = RespuestaDe<"post /api/items-catalogo/importacion/previsualizar">;
export type FilaValidadaCatalogo = PrevisualizacionCatalogo["filas"][number];
export type ResultadoImportacionCatalogo = RespuestaDe<"post /api/items-catalogo/importacion">;
