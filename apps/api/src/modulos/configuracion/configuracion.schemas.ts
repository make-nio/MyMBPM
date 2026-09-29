import { z } from "zod";

import { OPCIONES_DEVOLUCION_STOCK } from "../../compartido/dominio/enums";

export const actualizarConfiguracionSchema = z
  .object({
    cancelarPedido: z.enum(OPCIONES_DEVOLUCION_STOCK).optional(),
    cancelarOrden: z.enum(OPCIONES_DEVOLUCION_STOCK).optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");
