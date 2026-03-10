import { z } from "zod";

export const idSchema = z.coerce.bigint().positive();

export const estadoActivoSchema = z.object({
  activo: z.boolean()
});

export const paginacionSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});
