import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type Cliente = RespuestaDe<"get /api/clientes/{id}">;

export type ClientePayload = CuerpoDe<"post /api/clientes">;

export type SegmentoCliente = Cliente["segmento"];
// Tipo de cliente (#100), en el orden en que se ofrece. Que separa un comercio de un revendedor
// todavia no esta decidido: aca solo se nombran.
export const SEGMENTOS_CLIENTE: ReadonlyArray<{ valor: SegmentoCliente; nombre: string }> = [
  { valor: "CONSUMIDOR", nombre: "Consumidor" },
  { valor: "COMERCIO", nombre: "Comercio" },
  { valor: "REVENDEDOR", nombre: "Revendedor" }
];

export function nombreSegmento(segmento: SegmentoCliente) {
  return SEGMENTOS_CLIENTE.find((opcion) => opcion.valor === segmento)?.nombre ?? segmento;
}

// GET /api/clientes/:id/resumen: lo que compro (criterio "vendido": pedidos confirmados y no
// cancelados). Solo importes de venta, sin costos: lo ven todos.
export type ResumenCliente = RespuestaDe<"get /api/clientes/{id}/resumen">;
