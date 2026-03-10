export const TIPOS_ITEM = ["PRODUCTO", "INSUMO"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export const ESTADOS_PEDIDO = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO"
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ORIGENES_PEDIDO = ["WEB", "INSTAGRAM", "WHATSAPP", "MANUAL"] as const;
export type OrigenPedido = (typeof ORIGENES_PEDIDO)[number];

export const ESTADOS_COBRO = ["PENDIENTE", "SEÑADO", "PAGADO"] as const;
export type EstadoCobro = (typeof ESTADOS_COBRO)[number];

export const ESTADOS_PRODUCCION = [
  "PENDIENTE",
  "EN_PROCESO",
  "FINALIZADA",
  "CANCELADA"
] as const;
export type EstadoProduccion = (typeof ESTADOS_PRODUCCION)[number];

export const ESTADOS_SOLICITUD = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "CONVERTIDA_A_PEDIDO"
] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const TIPOS_STOCK = ["PRODUCTO", "INSUMO"] as const;
export type TipoStock = (typeof TIPOS_STOCK)[number];

export const TIPOS_MOVIMIENTO = [
  "ALTA_INICIAL",
  "AJUSTE_POSITIVO",
  "AJUSTE_NEGATIVO",
  "INGRESO_PRODUCCION",
  "EGRESO_PEDIDO",
  "EGRESO_PRODUCCION",
  "REVERSO"
] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const ORIGENES_MOVIMIENTO = ["MANUAL", "PEDIDO", "PRODUCCION"] as const;
export type OrigenMovimiento = (typeof ORIGENES_MOVIMIENTO)[number];
