import { z } from "zod";

import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

export const clienteParamsSchema = z.object({
  id: idSchema
});

export const crearClienteSchema = z.object({
  nombre: z.string().min(1).max(120),
  apellido: z.string().max(120).optional(),
  documento: z.string().max(30).optional(),
  telefono: z.string().max(50).optional(),
  email: z.string().email().max(150).optional(),
  instagram: z.string().max(150).optional(),
  domicilio: z.string().max(250).optional(),
  localidad: z.string().max(120).optional(),
  provincia: z.string().max(120).optional(),
  observaciones: z.string().max(2000).optional(),
  activo: z.boolean().optional()
});

export const actualizarClienteSchema = crearClienteSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Debe enviar al menos un campo para actualizar"
);

export const actualizarEstadoClienteSchema = z.object({
  activo: z.boolean()
});

export const listarClientesQuerySchema = paginacionSchema.extend({
  busqueda: z.string().max(150).optional(),
  activo: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});
