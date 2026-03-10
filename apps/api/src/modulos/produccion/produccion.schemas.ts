import { z } from "zod";

import { ESTADOS_PRODUCCION } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const decimalPositivoSchema = z.coerce.number().positive();

export const ordenProduccionParamsSchema = z.object({
  id: idSchema
});

export const ordenProduccionDetalleParamsSchema = z.object({
  id: idSchema,
  detalleId: idSchema
});

export const listarOrdenesProduccionQuerySchema = paginacionSchema.extend({
  estadoProduccion: z.enum(ESTADOS_PRODUCCION).optional()
});

export const crearOrdenProduccionSchema = z.object({
  observaciones: z.string().max(2000).optional(),
  activo: z.boolean().optional()
});

export const agregarDetalleProduccionSchema = z.object({
  idItemCatalogoProducto: idSchema,
  cantidad: decimalPositivoSchema,
  observaciones: z.string().max(2000).optional()
});

export const actualizarDetalleProduccionSchema = z
  .object({
    cantidad: decimalPositivoSchema.optional(),
    observaciones: z.string().max(2000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");

export const actualizarEstadoProduccionSchema = z.object({
  estadoProduccion: z.enum(ESTADOS_PRODUCCION),
  observaciones: z.string().max(2000).optional()
});

export const accionProduccionSchema = z.object({
  idUsuario: idSchema.optional()
});
