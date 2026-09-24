import { Endpoint, decimal, fecha, id, lista, objeto, z } from "../base";
import {
  ESTADOS_PRODUCCION,
  ORIGENES_MOVIMIENTO,
  TIPOS_ITEM,
  TIPOS_MOVIMIENTO,
  TIPOS_STOCK
} from "../../compartido/dominio/enums";
import { resumenPanelQuerySchema } from "../../modulos/panel/panel.schemas";
import { camposPedido } from "./pedidos";
import { totalesVentasSchema } from "./reportes";

const etiqueta = "panel";

// Pedido del panel: el pedido entero con un resumen del cliente (panel.repository).
const pedidoDelPanelSchema = objeto({
  ...camposPedido,
  cliente: objeto({ idCliente: id, nombre: z.string(), apellido: z.string().nullable() })
}).openapi("PedidoDelPanel");

const entregasSchema = objeto({ total: z.number().int(), pedidos: lista(pedidoDelPanelSchema) });
const ultimosPedidosSchema = objeto({ total: z.number().int(), ultimos: lista(pedidoDelPanelSchema) });

// Orden en proceso con sus lineas y el nombre del producto de cada una.
const ordenEnProcesoSchema = objeto({
  idOrdenProduccion: id,
  estadoProduccion: z.enum(ESTADOS_PRODUCCION),
  observaciones: z.string().nullable(),
  fechaAlta: fecha,
  fechaInicio: fecha.nullable(),
  fechaFin: fecha.nullable(),
  activo: z.boolean(),
  fechaModificacion: fecha,
  detalles: lista(
    objeto({
      idOrdenProduccionDetalle: id,
      idOrdenProduccion: id,
      idItemCatalogoProducto: id,
      cantidad: decimal,
      observaciones: z.string().nullable(),
      fechaAlta: fecha,
      fechaModificacion: fecha,
      itemCatalogoProducto: objeto({ idItemCatalogo: id, nombre: z.string() })
    })
  )
});

// Existencia de un item (stockService.obtenerExistencias), con su categoria entera.
const existenciaSchema = objeto({
  idItemCatalogo: id,
  nombre: z.string(),
  tipoItem: z.enum(TIPOS_ITEM),
  tipoStock: z.enum(TIPOS_STOCK),
  activo: z.boolean(),
  categoria: objeto({
    idCategoria: id,
    nombre: z.string(),
    slug: z.string(),
    descripcion: z.string().nullable(),
    activo: z.boolean(),
    fechaAlta: fecha,
    fechaModificacion: fecha
  }),
  stockMinimo: z.number().int(),
  stockActual: decimal,
  bajoMinimo: z.boolean(),
  fechaUltimoMovimiento: fecha.nullable()
}).openapi("ExistenciaDelPanel");

// Movimiento de stock (stockRepository.listarUltimosMovimientos): sin la clave del usuario.
const movimientoSchema = objeto({
  idEstadoStock: id,
  idItemCatalogo: id,
  idUsuario: id.nullable(),
  tipoStock: z.enum(TIPOS_STOCK),
  stockActual: decimal,
  stockAnterior: decimal,
  tipoMovimiento: z.enum(TIPOS_MOVIMIENTO),
  cantidadMovimiento: decimal,
  origenMovimiento: z.enum(ORIGENES_MOVIMIENTO),
  idReferenciaOrigen: id.nullable(),
  idReferenciaDetalle: id.nullable(),
  observaciones: z.string().nullable(),
  fechaAlta: fecha,
  itemCatalogo: objeto({ idItemCatalogo: id, nombre: z.string(), tipoItem: z.enum(TIPOS_ITEM) }),
  usuario: objeto({ idUsuario: id, nombre: z.string(), apellido: z.string() }).nullable()
}).openapi("MovimientoDelPanel");

const resumenPanelSchema = objeto({
  // Pedidos abiertos con fecha prometida: vencida, o de hoy a 7 dias. `total` cuenta todos;
  // la lista trae hasta `limite`.
  entregas: objeto({
    atrasados: entregasSchema,
    estaSemana: entregasSchema
  }),
  pedidos: objeto({
    pendientes: ultimosPedidosSchema,
    confirmados: ultimosPedidosSchema
  }),
  produccion: objeto({
    enProceso: objeto({ total: z.number().int(), ordenes: lista(ordenEnProcesoSchema) }),
    pendientes: z.number().int()
  }),
  stockBajo: objeto({ total: z.number().int(), items: lista(existenciaSchema) }),
  ultimosMovimientos: lista(movimientoSchema),
  // Solo para quien puede ver costos (administradores): el service no lo arma para los demas.
  // Como solo llega a administradores, el middleware de costos no le quita `costo`.
  ventasDelMes: objeto({ desde: fecha, ...totalesVentasSchema.shape }).optional()
}).openapi("ResumenPanel");

const avisosSchema = objeto({
  stockBajo: z.number().int(),
  entregasAtrasadas: z.number().int(),
  entregasHoy: z.number().int()
}).openapi("AvisosPanel");

export const endpoints: Endpoint[] = [
  {
    metodo: "get",
    ruta: "/api/panel/resumen",
    resumen: "Resumen del inicio: entregas, pedidos por confirmar y entregar, produccion, stock bajo, ultimos movimientos y ventas del mes",
    etiqueta,
    query: resumenPanelQuerySchema,
    respuesta: resumenPanelSchema
  },
  {
    metodo: "get",
    ruta: "/api/panel/avisos",
    resumen: "Cuantos avisos hay para el encabezado: stock bajo, entregas atrasadas y entregas de hoy",
    etiqueta,
    respuesta: avisosSchema
  }
];
