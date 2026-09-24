import type { RespuestaDe } from "@contrato";

// Una fila del CSV como texto, sin convertir: la valida la API.
export type FilaImportacionCliente = Partial<
  Record<
    | "nombre"
    | "apellido"
    | "documento"
    | "telefono"
    | "email"
    | "instagram"
    | "domicilio"
    | "localidad"
    | "provincia"
    | "observaciones"
    | "activo",
    string
  >
>;

// Respuestas: sacadas del contrato de la API (apps/api/src/contrato).
export type PrevisualizacionClientes = RespuestaDe<"post /api/clientes/importacion/previsualizar">;
export type FilaValidadaCliente = PrevisualizacionClientes["filas"][number];
export type ResultadoImportacionClientes = RespuestaDe<"post /api/clientes/importacion">;
