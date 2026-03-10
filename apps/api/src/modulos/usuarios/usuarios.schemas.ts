import { z } from "zod";

import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

export const usuarioParamsSchema = z.object({
  id: idSchema
});

export const listarUsuariosQuerySchema = paginacionSchema.extend({
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  email: z.string().email().max(150),
  usuario: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  activo: z.boolean().optional()
});

export const actualizarUsuarioSchema = z
  .object({
    nombre: z.string().min(1).max(100).optional(),
    apellido: z.string().min(1).max(100).optional(),
    email: z.string().email().max(150).optional(),
    usuario: z.string().min(1).max(100).optional(),
    activo: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");

export const actualizarEstadoUsuarioSchema = z.object({
  activo: z.boolean()
});

export const cambiarClaveUsuarioSchema = z.object({
  passwordActual: z.string().min(8).max(100).optional(),
  passwordNueva: z.string().min(8).max(100)
});
