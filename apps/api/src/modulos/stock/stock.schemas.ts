import { z } from "zod";

import { TIPOS_ITEM, TIPOS_MOVIMIENTO, TIPOS_STOCK } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const cantidadSchema = z.coerce.number().positive();

export const stockActualQuerySchema = z.object({
  idItemCatalogo: idSchema,
  tipoStock: z.enum(TIPOS_STOCK).default("PRODUCTO")
});

export const historialStockQuerySchema = paginacionSchema.extend({
  idItemCatalogo: idSchema,
  tipoStock: z.enum(TIPOS_STOCK).optional()
});

export const bajoStockQuerySchema = paginacionSchema.extend({
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export const existenciasQuerySchema = z.object({
  tipoItem: z.enum(TIPOS_ITEM).optional(),
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
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
  observaciones: z.string().max(2000).optional()
});
