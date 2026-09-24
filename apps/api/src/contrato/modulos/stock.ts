import {
  ORIGENES_MOVIMIENTO,
  TIPOS_ITEM,
  TIPOS_MOVIMIENTO,
  TIPOS_STOCK
} from "../../compartido/dominio/enums";
import { bajoStockQuerySchema, existenciasQuerySchema } from "../../modulos/stock/stock.schemas";
import { decimal, Endpoint, fecha, id, lista, objeto, z } from "../base";

// Contrato del modulo stock (src/modulos/stock). Ninguna respuesta de stock trae costos.

const etiqueta = "stock";

// Fila de ESTADO_STOCK tal cual la devuelve Prisma (sin include).
const camposMovimiento = {
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
  fechaAlta: fecha
};

export const movimientoStockSchema = objeto(camposMovimiento);

// select usuarioDelMovimiento (stock.repository.ts): nunca claveHash.
export const usuarioDelMovimientoSchema = objeto({
  idUsuario: id,
  nombre: z.string(),
  apellido: z.string()
}).openapi("UsuarioDelMovimiento");

// Historial: el movimiento con su usuario (null si lo genero el sistema sin sesion).
const movimientoConUsuarioSchema = objeto({
  ...camposMovimiento,
  usuario: usuarioDelMovimientoSchema.nullable()
}).openapi("MovimientoStock");

const stockActualSchema = objeto({
  idItemCatalogo: id,
  tipoStock: z.enum(TIPOS_STOCK),
  stockActual: decimal,
  ultimoMovimiento: movimientoStockSchema.nullable()
});

// include categoria: true en listarItemsParaExistencias (la categoria entera).
const categoriaSchema = objeto({
  idCategoria: id,
  nombre: z.string(),
  slug: z.string(),
  descripcion: z.string().nullable(),
  activo: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha
}).openapi("CategoriaDeExistencia");

// Armado a mano en stockService.obtenerExistencias. tipoStock es siempre igual a tipoItem.
const existenciaSchema = objeto({
  idItemCatalogo: id,
  nombre: z.string(),
  tipoItem: z.enum(TIPOS_ITEM),
  tipoStock: z.enum(TIPOS_STOCK),
  activo: z.boolean(),
  categoria: categoriaSchema,
  // Int de Prisma: numero JS, no Decimal.
  stockMinimo: z.number().int(),
  stockActual: decimal,
  bajoMinimo: z.boolean(),
  // Sale de $queryRaw (FECHA_ALTA timestamptz -> Date -> ISO).
  fechaUltimoMovimiento: fecha.nullable()
}).openapi("Existencia");

// Los query schemas del modulo usan idSchema (z.coerce.bigint), que zod-to-openapi no soporta:
// estos son equivalentes para la doc.
const paginacion = {
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
};

const stockActualQuery = objeto({
  idItemCatalogo: id,
  tipoStock: z.enum(TIPOS_STOCK).default("PRODUCTO")
});

const historialQuery = objeto({
  ...paginacion,
  idItemCatalogo: id,
  tipoStock: z.enum(TIPOS_STOCK).optional(),
  origenMovimiento: z.enum(ORIGENES_MOVIMIENTO).optional(),
  idReferenciaOrigen: id.optional()
});

// Equivalente a crearAjusteStockSchema (que usa idSchema y un refine).
const crearAjusteBody = objeto({
  idItemCatalogo: id,
  tipoStock: z.enum(TIPOS_STOCK),
  tipoMovimiento: z.enum(["AJUSTE_POSITIVO", "AJUSTE_NEGATIVO"]),
  cantidad: z.coerce.number().positive(),
  observaciones: z.string().trim().min(1).max(2000)
});

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/stock/actual",
    resumen: "Stock vigente de un item y tipo de stock, con su ultimo movimiento",
    etiqueta,
    query: stockActualQuery,
    respuesta: stockActualSchema
  },
  {
    metodo: "get",
    ruta: "/api/stock/historial",
    resumen: "Historial de movimientos de stock de un item, del mas nuevo al mas viejo",
    etiqueta,
    query: historialQuery,
    respuesta: lista(movimientoConUsuarioSchema)
  },
  {
    metodo: "get",
    ruta: "/api/stock/existencias",
    resumen: "Stock vigente de cada item del catalogo, con filtros y paginacion opcional",
    etiqueta,
    query: existenciasQuerySchema,
    respuesta: lista(existenciaSchema)
  },
  {
    metodo: "get",
    ruta: "/api/stock/bajo-stock",
    resumen: "Items con stock igual o por debajo de su stock minimo",
    etiqueta,
    query: bajoStockQuerySchema,
    respuesta: lista(existenciaSchema)
  },
  {
    metodo: "post",
    ruta: "/api/stock/ajustes",
    resumen: "Registra un ajuste manual de stock (positivo o negativo) con su motivo",
    etiqueta,
    body: crearAjusteBody,
    // El movimiento creado, sin el usuario incluido.
    respuesta: movimientoStockSchema,
    status: 201
  }
] as const satisfies readonly Endpoint[];
