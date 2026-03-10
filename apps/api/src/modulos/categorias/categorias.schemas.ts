import { z } from "zod";

import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

export const categoriaParamsSchema = z.object({
  id: idSchema
});

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(1).max(120),
  slug: z.string().min(1).max(160),
  descripcion: z.string().max(1000).optional(),
  activo: z.boolean().optional()
});

export const actualizarCategoriaSchema = crearCategoriaSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Debe enviar al menos un campo para actualizar"
);

export const actualizarEstadoCategoriaSchema = z.object({
  activo: z.boolean()
});

export const listarCategoriasQuerySchema = paginacionSchema.extend({
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});
