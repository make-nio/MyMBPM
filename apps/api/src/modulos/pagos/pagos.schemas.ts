import { z } from "zod";

import { MEDIOS_PAGO } from "../../compartido/dominio/enums";
import { diaArgentinaAFecha } from "../../compartido/dominio/fecha-argentina";
import { idSchema, LIMITES } from "../../compartido/validaciones/esquemas-comunes";

export const pagosParamsSchema = z.object({
  id: idSchema
});

export const pagoParamsSchema = z.object({
  id: idSchema,
  pagoId: idSchema
});

export const registrarPagoSchema = z.object({
  // Dia del pago ("2026-09-30"), en hora de Argentina, como la fecha de entrega.
  fecha: z
    .string()
    .max(10)
    .transform((dia, ctx) => {
      const fecha = diaArgentinaAFecha(dia);

      if (!fecha) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha del pago tiene que ser un dia valido (AAAA-MM-DD)" });
        return z.NEVER;
      }

      return fecha;
    }),
  monto: z.coerce.number().positive("El monto tiene que ser mayor a cero").max(LIMITES.monto),
  medioPago: z.enum(MEDIOS_PAGO),
  observaciones: z.string().trim().max(500).optional()
});

export const anularPagoSchema = z.object({
  motivo: z.string().trim().min(1, "Indica el motivo de la anulacion").max(500)
});
