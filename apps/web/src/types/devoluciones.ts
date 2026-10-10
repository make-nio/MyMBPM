import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type DevolucionesDelPedido = RespuestaDe<"get /api/pedidos/{id}/devoluciones">;
export type Devolucion = DevolucionesDelPedido["devoluciones"][number];
export type RegistrarDevolucionPayload = CuerpoDe<"post /api/pedidos/{id}/devoluciones">;
