import { z } from "zod";

import { MEDIOS_PAGO } from "../../compartido/dominio/enums";
import { cantidadSchema, idSchema, LIMITES } from "../../compartido/validaciones/esquemas-comunes";

export const devolucionesParamsSchema = z.object({
  id: idSchema
});

export const registrarDevolucionSchema = z
  .object({
    // Que vuelve: lineas del pedido y cantidades (puede ser una parte).
    lineas: z
      .array(z.object({ idPedidoDetalle: idSchema, cantidad: cantidadSchema }))
      .min(1, "Indica que se devuelve")
      .max(LIMITES.lineasPorPedido),
    motivo: z.string().trim().min(1, "Indica el motivo de la devolucion").max(500),
    // Una por formulario (la genera la web y la reusa en cada reintento): la misma clave no
    // registra otra devolucion.
    claveIdempotencia: z.string().max(64).uuid("La clave de idempotencia tiene que ser un uuid"),
    // Solo cuando la configuracion pide preguntar (ver configuracion.service).
    devolverStock: z.boolean().optional(),
    reintegrar: z.boolean().optional(),
    // Si se reintegra la plata: cuanto y por que medio.
    montoReintegro: z.coerce.number().positive("El monto tiene que ser mayor a cero").max(LIMITES.monto).optional(),
    medioReintegro: z.enum(MEDIOS_PAGO).optional()
  })
  .refine(
    (data) => new Set(data.lineas.map((linea) => linea.idPedidoDetalle)).size === data.lineas.length,
    { message: "Cada linea del pedido va una sola vez", path: ["lineas"] }
  );
