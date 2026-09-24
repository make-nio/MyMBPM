import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type Cliente = RespuestaDe<"get /api/clientes/{id}">;

export type ClientePayload = CuerpoDe<"post /api/clientes">;

// GET /api/clientes/:id/resumen: lo que compro (criterio "vendido": pedidos confirmados y no
// cancelados). Solo importes de venta, sin costos: lo ven todos.
export type ResumenCliente = RespuestaDe<"get /api/clientes/{id}/resumen">;
