import { z } from "zod";

import { diaArgentinaAFecha, sumarDias } from "../dominio/fecha-argentina";

// Un dia ("2026-09-30") como las 00:00 de ese dia en Argentina: el comienzo de un rango.
export const diaDesdeSchema = z.string().max(10).transform((dia, ctx) => {
  const fecha = diaArgentinaAFecha(dia);

  if (!fecha) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tiene que ser un dia valido (AAAA-MM-DD)" });
    return z.NEVER;
  }

  return fecha;
});

// El fin de un rango que incluye ese dia: las 00:00 del dia siguiente, para comparar con "<".
export const diaHastaSchema = diaDesdeSchema.transform((fecha) => sumarDias(fecha, 1));
