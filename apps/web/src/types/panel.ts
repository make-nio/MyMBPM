import type { RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
// ventasDelMes solo llega para administradores.
export type ResumenPanel = RespuestaDe<"get /api/panel/resumen">;

export type AvisosPanel = RespuestaDe<"get /api/panel/avisos">;
