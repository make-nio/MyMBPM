import { z } from "zod";

// Mes del reporte, "2026-09". Sin mes, el mes en curso (hora de Argentina).
export const ventasMesQuerySchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes tiene que tener el formato AAAA-MM")
    .optional()
});
