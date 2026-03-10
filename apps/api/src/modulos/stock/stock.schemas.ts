import { z } from "zod";

import {
  ORIGENES_MOVIMIENTO,
  TIPOS_MOVIMIENTO,
  TIPOS_STOCK
} from "../../compartido/dominio/enums";
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

export const crearAjusteStockSchema = z.object({
  idItemCatalogo: idSchema,
  idUsuario: idSchema.optional(),
  tipoStock: z.enum(TIPOS_STOCK),
  tipoMovimiento: z.enum(TIPOS_MOVIMIENTO).refine(
    (value) => value === "AJUSTE_POSITIVO" || value === "AJUSTE_NEGATIVO",
    "Solo se permiten AJUSTE_POSITIVO o AJUSTE_NEGATIVO"
  ),
  cantidad: cantidadSchema,
  observaciones: z.string().max(2000).optional(),
  origenMovimiento: z.enum(ORIGENES_MOVIMIENTO).default("MANUAL"),
  idReferenciaOrigen: idSchema.optional(),
  idReferenciaDetalle: idSchema.optional()
});
