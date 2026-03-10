import { z } from "zod";

export const loginSchema = z.object({
  identificador: z.string().min(1).max(150),
  password: z.string().min(8).max(100)
});
