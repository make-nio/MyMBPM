import type { CuerpoDe, RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
// El listado trae el cliente; el detalle, ademas, las lineas con su item.
export type Pedido = RespuestaDe<"get /api/pedidos">[number];
export type PedidoCompleto = RespuestaDe<"get /api/pedidos/{id}">;
export type PedidoDetalle = PedidoCompleto["detalles"][number];

export type EstadoPedido = Pedido["estadoPedido"];
export type EstadoCobro = Pedido["estadoCobro"];
export type OrigenPedido = Pedido["origenPedido"];

export const ESTADOS_PEDIDO = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO"
] as const;
export const ESTADOS_COBRO = ["PENDIENTE", "SEÑADO", "PAGADO"] as const;
export const ORIGENES_PEDIDO = ["WEB", "INSTAGRAM", "WHATSAPP", "MANUAL"] as const;
// No compilan si las listas no tienen exactamente los valores del contrato.
export type EstadosPedidoCompletos = Afirmar<ListaCompleta<typeof ESTADOS_PEDIDO, EstadoPedido>>;
export type EstadosCobroCompletos = Afirmar<ListaCompleta<typeof ESTADOS_COBRO, EstadoCobro>>;
export type OrigenesPedidoCompletos = Afirmar<ListaCompleta<typeof ORIGENES_PEDIDO, OrigenPedido>>;

// Transiciones que acepta PATCH /api/pedidos/:id/estado (espejo de pedidos.service.ts; la API
// es la que valida). CONFIRMADO solo se alcanza con "Confirmar pedido", que descuenta stock.
export const TRANSICIONES_ESTADO_PEDIDO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  PENDIENTE: ["CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"],
  EN_PREPARACION: ["LISTO", "ENTREGADO", "CANCELADO"],
  LISTO: ["EN_PREPARACION", "ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: []
};

export type PedidoAltaPayload = CuerpoDe<"post /api/pedidos">;
export type PedidoEstadoPayload = CuerpoDe<"patch /api/pedidos/{id}/estado">;

// GET /api/pedidos/:id/repeticion: vista previa de "Repetir" con los precios de hoy. Las lineas
// no disponibles (item inactivo, borrado o sin precio) no se van a repetir.
export type RepeticionPedido = RespuestaDe<"get /api/pedidos/{id}/repeticion">;
export type LineaRepeticion = RepeticionPedido["lineas"][number];
