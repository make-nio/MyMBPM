import { ESTADOS_PRODUCCION, TIPOS_ITEM } from "../../compartido/dominio/enums";
import {
  actualizarDetalleProduccionSchema,
  actualizarEstadoProduccionSchema,
  crearOrdenProduccionSchema,
  agregarDetalleProduccionSchema,
  listarOrdenesProduccionQuerySchema
} from "../../modulos/produccion/produccion.schemas";
import { decimal, Endpoint, fecha, id, lista, objeto, z } from "../base";

// Contrato del modulo produccion (src/modulos/produccion).

const etiqueta = "produccion";

// ITEM_CATALOGO entero (include itemCatalogoProducto/itemCatalogoInsumo: true en obtenerPorId).
// costo lo quita ocultarCostosSinPermiso a quien no es administrador: por eso es opcional.
const itemCatalogoSchema = objeto({
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
}).openapi("ItemDeOrden");

const camposOrden = {
  idOrdenProduccion: id,
  estadoProduccion: z.enum(ESTADOS_PRODUCCION),
  observaciones: z.string().nullable(),
  fechaAlta: fecha,
  fechaInicio: fecha.nullable(),
  fechaFin: fecha.nullable(),
  activo: z.boolean(),
  fechaModificacion: fecha
};

const camposDetalle = {
  idOrdenProduccionDetalle: id,
  idOrdenProduccion: id,
  idItemCatalogoProducto: id,
  cantidad: decimal,
  observaciones: z.string().nullable(),
  fechaAlta: fecha,
  fechaModificacion: fecha
};

const camposConsumo = {
  idOrdenProduccionConsumo: id,
  idOrdenProduccion: id,
  idItemCatalogoInsumo: id,
  cantidad: decimal,
  fechaAlta: fecha
};

// La orden sola (crear y actualizarEstado: create/update sin include).
const ordenSchema = objeto(camposOrden);

// Listado (tablero): del producto solo el nombre, consumos sin item.
const ordenListadoSchema = objeto({
  ...camposOrden,
  detalles: lista(
    objeto({
      ...camposDetalle,
      itemCatalogoProducto: objeto({ nombre: z.string() })
    })
  ),
  consumos: lista(objeto(camposConsumo))
}).openapi("OrdenProduccionListado");

// Detalle (produccionRepository.obtenerPorId): detalles y consumos con el item entero.
const ordenCompletaSchema = objeto({
  ...camposOrden,
  detalles: lista(
    objeto({
      ...camposDetalle,
      itemCatalogoProducto: itemCatalogoSchema
    })
  ),
  consumos: lista(
    objeto({
      ...camposConsumo,
      itemCatalogoInsumo: itemCatalogoSchema
    })
  )
}).openapi("OrdenProduccion");

const params = objeto({ id });
const paramsDetalle = objeto({ id, detalleId: id });

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/produccion",
    acceso: "autenticado",
    resumen: "Lista las ordenes de produccion, de la mas nueva a la mas vieja",
    etiqueta,
    query: listarOrdenesProduccionQuerySchema,
    respuesta: lista(ordenListadoSchema)
  },
  {
    metodo: "get",
    ruta: "/api/produccion/{id}",
    acceso: "autenticado",
    resumen: "Obtiene una orden de produccion con sus detalles y consumos",
    etiqueta,
    params,
    respuesta: ordenCompletaSchema
  },
  {
    metodo: "post",
    ruta: "/api/produccion",
    acceso: "autenticado",
    resumen: "Crea una orden de produccion pendiente, sin detalles",
    etiqueta,
    body: crearOrdenProduccionSchema,
    respuesta: ordenSchema,
    status: 201
  },
  {
    metodo: "post",
    ruta: "/api/produccion/{id}/detalles",
    acceso: "autenticado",
    resumen: "Agrega un producto a una orden pendiente y devuelve la orden completa",
    etiqueta,
    params,
    body: agregarDetalleProduccionSchema,
    respuesta: ordenCompletaSchema,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/produccion/{id}/detalles/{detalleId}",
    acceso: "autenticado",
    resumen: "Cambia cantidad u observaciones de un detalle de una orden pendiente",
    etiqueta,
    params: paramsDetalle,
    body: actualizarDetalleProduccionSchema,
    respuesta: ordenCompletaSchema
  },
  {
    metodo: "delete",
    ruta: "/api/produccion/{id}/detalles/{detalleId}",
    acceso: "autenticado",
    resumen: "Quita un detalle de una orden pendiente y devuelve la orden completa",
    etiqueta,
    params: paramsDetalle,
    respuesta: ordenCompletaSchema
  },
  {
    metodo: "patch",
    ruta: "/api/produccion/{id}/estado",
    acceso: "autenticado",
    resumen: "Cancela una orden pendiente o en proceso (no devuelve el stock consumido)",
    etiqueta,
    params,
    body: actualizarEstadoProduccionSchema,
    respuesta: ordenSchema
  },
  {
    metodo: "post",
    ruta: "/api/produccion/{id}/iniciar",
    acceso: "autenticado",
    resumen: "Inicia la orden: descuenta los insumos segun la receta y registra los consumos",
    etiqueta,
    params,
    respuesta: ordenCompletaSchema
  },
  {
    metodo: "post",
    ruta: "/api/produccion/{id}/finalizar",
    acceso: "autenticado",
    resumen: "Finaliza la orden: ingresa al stock los productos fabricados",
    etiqueta,
    params,
    respuesta: ordenCompletaSchema
  }
] as const satisfies readonly Endpoint[];
