import { z } from "zod";

import { MODOS_DEVOLUCION_STOCK } from "../../compartido/dominio/enums";

export const actualizarConfiguracionSchema = z
  .object({
    cancelarPedidoModo: z.enum(MODOS_DEVOLUCION_STOCK).optional(),
    cancelarPedidoDevolver: z.boolean().optional(),
    cancelarOrdenModo: z.enum(MODOS_DEVOLUCION_STOCK).optional(),
    cancelarOrdenDevolver: z.boolean().optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");
