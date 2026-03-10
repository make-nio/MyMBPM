import { z } from "zod";

import { ESTADOS_SOLICITUD } from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

export const solicitudEspecialParamsSchema = z.object({
  id: idSchema
});

export const listarSolicitudesEspecialesQuerySchema = paginacionSchema.extend({
  idCliente: idSchema.optional(),
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD).optional()
});

export const crearSolicitudEspecialSchema = z.object({
  idCliente: idSchema.optional(),
  nombreSolicitante: z.string().min(1).max(150),
  telefono: z.string().max(50).optional(),
  email: z.string().email().max(150).optional(),
  descripcion: z.string().min(1).max(4000),
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD).optional(),
  observaciones: z.string().max(2000).optional()
});

export const actualizarSolicitudEspecialSchema = z
  .object({
    idCliente: idSchema.optional(),
    nombreSolicitante: z.string().min(1).max(150).optional(),
    telefono: z.string().max(50).optional(),
    email: z.string().email().max(150).optional(),
    descripcion: z.string().min(1).max(4000).optional(),
    estadoSolicitud: z.enum(ESTADOS_SOLICITUD).optional(),
    observaciones: z.string().max(2000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");

export const actualizarEstadoSolicitudEspecialSchema = z.object({
  estadoSolicitud: z.enum(ESTADOS_SOLICITUD)
});
