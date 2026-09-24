import { z } from "zod";

import { ORIGENES_MOVIMIENTO, TIPOS_ITEM, TIPOS_MOVIMIENTO, TIPOS_STOCK } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const cantidadSchema = z.coerce.number().positive();

export const stockActualQuerySchema = z.object({
  idItemCatalogo: idSchema,
  tipoStock: z.enum(TIPOS_STOCK).default("PRODUCTO")
});

// origenMovimiento + idReferenciaOrigen: los movimientos de un pedido u orden puntual, sin
// depender de cuantos movimientos tuvo el item despues.
export const historialStockQuerySchema = paginacionSchema.extend({
  idItemCatalogo: idSchema,
  tipoStock: z.enum(TIPOS_STOCK).optional(),
  origenMovimiento: z.enum(ORIGENES_MOVIMIENTO).optional(),
  idReferenciaOrigen: idSchema.optional()
});

export const bajoStockQuerySchema = paginacionSchema.extend({
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

// Sin limit devuelve todas (como siempre); con limit, la pagina pedida. Los filtros se aplican antes
// de paginar, asi "Cargar mas" sigue funcionando con busqueda y bajo minimo.
export const existenciasQuerySchema = z.object({
  tipoItem: z.enum(TIPOS_ITEM).optional(),
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  busqueda: z.string().trim().max(150).optional(),
  soloBajoMinimo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0)
});

// El usuario sale de la sesion y el origen es siempre MANUAL: no se aceptan del body.
export const crearAjusteStockSchema = z.object({
  idItemCatalogo: idSchema,
  tipoStock: z.enum(TIPOS_STOCK),
  tipoMovimiento: z.enum(TIPOS_MOVIMIENTO).refine(
    (value) => value === "AJUSTE_POSITIVO" || value === "AJUSTE_NEGATIVO",
    "Solo se permiten AJUSTE_POSITIVO o AJUSTE_NEGATIVO"
  ),
  cantidad: cantidadSchema,
  // El motivo es obligatorio: cada correccion manual tiene que quedar explicada en el historial.
  observaciones: z
    .string({ required_error: "Indica el motivo del ajuste" })
    .trim()
    .min(1, "Indica el motivo del ajuste")
    .max(2000)
});
