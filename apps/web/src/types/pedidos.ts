import { Cliente } from "./clientes";
import { ItemCatalogo } from "./items-catalogo";

export const ESTADOS_PEDIDO = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO"
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ESTADOS_COBRO = ["PENDIENTE", "SEÑADO", "PAGADO"] as const;
export type EstadoCobro = (typeof ESTADOS_COBRO)[number];

export const ORIGENES_PEDIDO = ["WEB", "INSTAGRAM", "WHATSAPP", "MANUAL"] as const;
export type OrigenPedido = (typeof ORIGENES_PEDIDO)[number];

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

export type PedidoDetalle = {
  idPedidoDetalle: string;
  idPedido: string;
  idItemCatalogo: string;
  nombreItemSnapshot: string;
  cantidad: string;
  precioUnitario: string;
  // Solo llega para administradores (ver puedeVerCostos en la API).
  costoUnitario?: string;
  subtotal: string;
  itemCatalogo?: ItemCatalogo;
};

export type Pedido = {
  idPedido: string;
  idCliente: string;
  numeroPedido: string | null;
  origenPedido: OrigenPedido;
  estadoPedido: EstadoPedido;
  estadoCobro: EstadoCobro;
  observacionesCliente: string | null;
  observacionesInternas: string | null;
  subtotal: string;
  total: string;
  fechaAlta: string;
  fechaConfirmacion: string | null;
  fechaEntrega: string | null;
  activo: boolean;
  cliente?: Cliente;
  detalles?: PedidoDetalle[];
};

export type PedidoAltaPayload = {
  idCliente: string;
  origenPedido: OrigenPedido;
  estadoCobro?: EstadoCobro;
  observacionesCliente?: string;
  observacionesInternas?: string;
};

export type PedidoEstadoPayload = Partial<{
  estadoPedido: EstadoPedido;
  estadoCobro: EstadoCobro;
  observacionesInternas: string;
}>;
