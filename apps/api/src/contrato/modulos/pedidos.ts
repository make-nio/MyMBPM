import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import {
  ESTADOS_COBRO,
  ESTADOS_PEDIDO,
  ORIGENES_PEDIDO,
  TIPOS_ITEM
} from "../../compartido/dominio/enums";
import {
  actualizarDetallePedidoSchema,
  actualizarEstadoPedidoSchema
} from "../../modulos/pedidos/pedidos.schemas";
import { clienteSchema } from "./clientes";

const etiqueta = "pedidos";

// Un pedido sin relaciones (modelo Pedido). Es lo que devuelven el alta y el cambio de estado;
// lo reusan panel y solicitudes especiales.
export const camposPedido = {
  idPedido: id,
  idCliente: id,
  numeroPedido: z.string().nullable(),
  origenPedido: z.enum(ORIGENES_PEDIDO),
  estadoPedido: z.enum(ESTADOS_PEDIDO),
  estadoCobro: z.enum(ESTADOS_COBRO),
  observacionesCliente: z.string().nullable(),
  observacionesInternas: z.string().nullable(),
  subtotal: decimal,
  total: decimal,
  fechaAlta: fecha,
  fechaConfirmacion: fecha.nullable(),
  fechaEntrega: fecha.nullable(),
  activo: z.boolean(),
  fechaModificacion: fecha
};

export const pedidoSchema = objeto(camposPedido);

// El item del catalogo entero, como lo trae include: { itemCatalogo: true } en cada detalle.
// Sin permiso de ver costos no viaja `costo` (pedidosService.presentar y el middleware).
const itemCatalogoDelDetalleSchema = objeto({
  idItemCatalogo: id,
  idCategoria: id,
  tipoItem: z.enum(TIPOS_ITEM),
  nombre: z.string(),
  slug: z.string(),
  codigo: z.string().nullable(),
  descripcionCorta: z.string().nullable(),
  descripcionCompleta: z.string().nullable(),
  observacionesInternas: z.string().nullable(),
  precio: decimal.nullable(),
  costo: decimal.nullable().optional(),
  tipoMaterial: z.string().nullable(),
  color: z.string().nullable(),
  imagenPrincipal: z.string().nullable(),
  stockMinimo: z.number().int(),
  activo: z.boolean(),
  publico: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha
}).openapi("ItemDelDetallePedido");

const detallePedidoSchema = objeto({
  idPedidoDetalle: id,
  idPedido: id,
  idItemCatalogo: id,
  nombreItemSnapshot: z.string(),
  cantidad: decimal,
  precioUnitario: decimal,
  // Snapshot del costo al cargar la linea: solo para quien puede ver costos.
  costoUnitario: decimal.optional(),
  subtotal: decimal,
  fechaAlta: fecha,
  fechaModificacion: fecha,
  itemCatalogo: itemCatalogoDelDetalleSchema
}).openapi("DetallePedido");

// Listado: cada pedido con su cliente entero, sin detalles.
const pedidoConClienteSchema = objeto({ ...camposPedido, cliente: clienteSchema }).openapi("PedidoConCliente");

// Detalle: con el cliente y las lineas (ordenadas por id).
const pedidoConDetallesSchema = objeto({
  ...camposPedido,
  cliente: clienteSchema,
  detalles: lista(detallePedidoSchema)
}).openapi("PedidoConDetalles");

// Vista previa de "Repetir": precios de venta de hoy, sin costos.
const repeticionSchema = objeto({
  idPedidoOriginal: id,
  numeroPedido: z.string().nullable(),
  idCliente: id,
  cliente: objeto({ nombre: z.string(), apellido: z.string().nullable() }),
  origenPedido: z.enum(ORIGENES_PEDIDO),
  lineas: lista(
    objeto({
      idItemCatalogo: id,
      nombre: z.string(),
      cantidad: decimal,
      precioAnterior: decimal,
      // null si la linea no se puede repetir (item borrado, inactivo o sin precio).
      precioHoy: decimal.nullable(),
      subtotal: decimal.nullable(),
      disponible: z.boolean(),
      motivo: z.string().nullable()
    })
  ),
  total: decimal
}).openapi("RepeticionPedido");

// Para la doc: los schemas de pedidos.schemas.ts usan z.coerce.bigint (idSchema), que
// zod-to-openapi no soporta, y el query es un ZodEffects (refine), que no entra como query.
// Estos son equivalentes: mismos campos y restricciones.
const idTexto = z.string().regex(/^\d+$/);
// Un dia "AAAA-MM-DD" (hora de Argentina). Mismo formato que diaDesdeSchema / fechaEntregaSchema.
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const listarPedidosQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  idCliente: idTexto.optional(),
  estadoPedido: z.enum(ESTADOS_PEDIDO).optional(),
  estadoCobro: z.enum(ESTADOS_COBRO).optional(),
  // Fecha de alta, los dos dias incluidos. desde no puede ser posterior a hasta.
  desde: dia.optional(),
  hasta: dia.optional()
});

const crearPedidoBody = z.object({
  idCliente: idTexto,
  origenPedido: z.enum(ORIGENES_PEDIDO),
  estadoCobro: z.enum(ESTADOS_COBRO).optional(),
  observacionesCliente: z.string().max(2000).optional(),
  observacionesInternas: z.string().max(2000).optional(),
  // Dia prometido de entrega; null la deja sin fecha.
  fechaEntrega: dia.nullable().optional(),
  activo: z.boolean().optional()
});

const agregarDetalleBody = z.object({
  idItemCatalogo: idTexto,
  cantidad: z.coerce.number().positive()
});

const params = objeto({ id });
const paramsDetalle = objeto({ id, detalleId: id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/pedidos",
    acceso: "autenticado",
    resumen: "Lista pedidos con su cliente, paginado, filtrando por cliente, estado, cobro y fecha de alta",
    etiqueta,
    query: listarPedidosQuery,
    respuesta: lista(pedidoConClienteSchema)
  },
  {
    metodo: "get",
    ruta: "/api/pedidos/{id}",
    acceso: "autenticado",
    resumen: "Obtiene un pedido con su cliente y sus lineas",
    etiqueta,
    params,
    respuesta: pedidoConDetallesSchema
  },
  {
    metodo: "post",
    ruta: "/api/pedidos",
    acceso: "autenticado",
    resumen: "Crea un pedido pendiente, sin lineas, con su numero PED-000000",
    etiqueta,
    body: crearPedidoBody,
    respuesta: pedidoSchema,
    status: 201
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/detalles",
    acceso: "autenticado",
    resumen: "Agrega una linea a un pedido pendiente con el precio y el costo de hoy del item",
    etiqueta,
    params,
    body: agregarDetalleBody,
    respuesta: pedidoConDetallesSchema,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/pedidos/{id}/detalles/{detalleId}",
    acceso: "autenticado",
    resumen: "Cambia la cantidad de una linea de un pedido pendiente",
    etiqueta,
    params: paramsDetalle,
    body: actualizarDetallePedidoSchema,
    respuesta: pedidoConDetallesSchema
  },
  {
    metodo: "delete",
    ruta: "/api/pedidos/{id}/detalles/{detalleId}",
    acceso: "autenticado",
    resumen: "Quita una linea de un pedido pendiente",
    etiqueta,
    params: paramsDetalle,
    respuesta: pedidoConDetallesSchema
  },
  {
    metodo: "patch",
    ruta: "/api/pedidos/{id}/estado",
    acceso: "autenticado",
    resumen: "Cambia estado, cobro, observaciones internas o fecha de entrega (para confirmar se usa /confirmar)",
    etiqueta,
    params,
    body: actualizarEstadoPedidoSchema,
    respuesta: pedidoSchema
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/confirmar",
    acceso: "autenticado",
    resumen: "Confirma un pedido pendiente y descuenta su stock",
    etiqueta,
    params,
    respuesta: pedidoConDetallesSchema
  },
  {
    metodo: "get",
    ruta: "/api/pedidos/{id}/repeticion",
    acceso: "autenticado",
    resumen: "Vista previa de repetir el pedido: sus lineas con el precio de hoy, sin crear nada",
    etiqueta,
    params,
    respuesta: repeticionSchema
  },
  {
    metodo: "post",
    ruta: "/api/pedidos/{id}/repetir",
    acceso: "autenticado",
    resumen: "Crea un pedido pendiente nuevo con las lineas repetibles del original, a precio de hoy",
    etiqueta,
    params,
    respuesta: pedidoConDetallesSchema,
    status: 201
  }
] as const satisfies readonly Endpoint[];
