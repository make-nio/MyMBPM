import { z } from "zod";

export const resumenPanelQuerySchema = z.object({
  // Cuantos elementos mostrar en cada lista del panel.
  limite: z.coerce.number().int().min(1).max(20).default(5)
});
