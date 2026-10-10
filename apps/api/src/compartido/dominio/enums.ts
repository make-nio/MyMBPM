export const TIPOS_ITEM = ["PRODUCTO", "INSUMO"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export const ESTADOS_PEDIDO = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGADO",
  "CANCELADO",
  // Despues de una devolucion (#96): queda algo entregado sin devolver, o ya volvio todo.
  // No se eligen a mano: los pone el registro de la devolucion.
  "DEVUELTO_PARCIAL",
  "DEVUELTO"
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

// Pedidos que llegaron al cliente: entregados, con o sin devolucion. Donde se cuentan
// "entregados", cuentan los tres.
export const ESTADOS_ENTREGADOS: readonly EstadoPedido[] = ["ENTREGADO", "DEVUELTO_PARCIAL", "DEVUELTO"];

// Quien hizo un cambio de estado de un pedido (#99). Hoy siempre PANTALLA; AGENTE queda para
// cuando un agente cambie estados.
export const ORIGENES_CAMBIO_ESTADO = ["PANTALLA", "AGENTE"] as const;
export type OrigenCambioEstado = (typeof ORIGENES_CAMBIO_ESTADO)[number];

// Tipo de cliente (#100). Lista fija; que separa un comercio de un revendedor lo deciden Mariano
// y Maxi (todavia no esta decidido). No hay precio por segmento.
export const SEGMENTOS_CLIENTE = ["CONSUMIDOR", "COMERCIO", "REVENDEDOR"] as const;
export type SegmentoCliente = (typeof SEGMENTOS_CLIENTE)[number];

export const ORIGENES_PEDIDO = ["WEB", "INSTAGRAM", "WHATSAPP", "MANUAL"] as const;
export type OrigenPedido = (typeof ORIGENES_PEDIDO)[number];

export const ESTADOS_COBRO = ["PENDIENTE", "SEÑADO", "PAGADO"] as const;
export type EstadoCobro = (typeof ESTADOS_COBRO)[number];

// Medios con los que se registra un pago (PAGO.MEDIO_PAGO). Maxi confirma cuales usa (#90).
export const MEDIOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO"] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

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
  "REVERSO",
  // Lo que vuelve de un pedido entregado (DEVOLUCION, #96).
  "INGRESO_DEVOLUCION"
] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const ORIGENES_MOVIMIENTO = ["MANUAL", "PEDIDO", "PRODUCCION", "DEVOLUCION"] as const;
export type OrigenMovimiento = (typeof ORIGENES_MOVIMIENTO)[number];

// Que hacer con el stock al cancelar un pedido que ya lo desconto o una orden en proceso, y con
// el stock y la plata al registrar la devolucion de un pedido entregado (CONFIGURACION), por
// accion: PREGUNTAR lo decide quien lo hace; DEVOLVER y NO_DEVOLVER se aplican sin preguntar.
// En el reintegro, DEVOLVER es reintegrar la plata.
export const OPCIONES_DEVOLUCION_STOCK = ["PREGUNTAR", "DEVOLVER", "NO_DEVOLVER"] as const;
export type OpcionDevolucionStock = (typeof OPCIONES_DEVOLUCION_STOCK)[number];

// Registro de cambios (AUDITORIA_CAMBIO): que entidades se auditan y que tipo de cambio fue.
export const ENTIDADES_AUDITADAS = ["ITEM_CATALOGO", "CLIENTE"] as const;
export type EntidadAuditada = (typeof ENTIDADES_AUDITADAS)[number];

export const ACCIONES_AUDITORIA = ["ALTA", "MODIFICACION", "ACTIVACION", "DESACTIVACION"] as const;
export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];
