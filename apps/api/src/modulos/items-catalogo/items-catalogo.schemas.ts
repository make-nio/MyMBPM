import { z } from "zod";

import { TIPOS_ITEM } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const decimalSchema = z.coerce.number().nonnegative();

export const itemCatalogoParamsSchema = z.object({
  id: idSchema
});

export const itemCatalogoImagenParamsSchema = z.object({
  id: idSchema,
  imagenId: idSchema
});

export const crearItemCatalogoSchema = z.object({
  idCategoria: idSchema,
  tipoItem: z.enum(TIPOS_ITEM),
  nombre: z.string().min(1).max(150),
  slug: z.string().min(1).max(180),
  codigo: z.string().max(80).optional(),
  descripcionCorta: z.string().max(300).optional(),
  descripcionCompleta: z.string().max(4000).optional(),
  observacionesInternas: z.string().max(2000).optional(),
  precio: decimalSchema.optional(),
  costo: decimalSchema.optional(),
  tipoMaterial: z.string().max(100).optional(),
  color: z.string().max(100).optional(),
  imagenPrincipal: z.string().max(500).optional(),
  stockMinimo: z.coerce.number().int().min(0).optional(),
  activo: z.boolean().optional(),
  publico: z.boolean().optional()
});

export const actualizarItemCatalogoSchema = crearItemCatalogoSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");

export const actualizarEstadoItemCatalogoSchema = z.object({
  activo: z.boolean()
});

export const listarItemsCatalogoQuerySchema = paginacionSchema.extend({
  tipoItem: z.enum(TIPOS_ITEM).optional(),
  idCategoria: idSchema.optional(),
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  publico: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export const crearImagenAdicionalSchema = z.object({
  urlImagen: z.string().min(1).max(500),
  orden: z.coerce.number().int().positive().optional(),
  activo: z.boolean().optional()
});
