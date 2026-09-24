import type { RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type RegistroAuditoria = RespuestaDe<"get /api/auditoria">[number];
export type EntidadAuditada = RegistroAuditoria["entidad"];
export type AccionAuditoria = RegistroAuditoria["accion"];
export type CambioAuditado = RegistroAuditoria["cambios"][number];

// Un punto de la linea de tiempo de precio y costo de un item. El costo solo llega a quien
// puede ver costos.
export type PuntoPrecio = RespuestaDe<"get /api/auditoria/precios">[number];
export type ValorAuditado = NonNullable<PuntoPrecio["precio"]>;
