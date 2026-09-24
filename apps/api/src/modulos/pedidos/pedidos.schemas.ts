import { z } from "zod";

import {
  ESTADOS_COBRO,
  ESTADOS_PEDIDO,
  ORIGENES_PEDIDO
} from "../../compartido/dominio/enums";
import { diaArgentinaAFecha } from "../../compartido/dominio/fecha-argentina";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const decimalPositivoSchema = z.coerce.number().positive();

// Fecha de entrega prometida al cliente: un dia ("2026-09-30"), sin hora. Se guarda como las
// 00:00 de ese dia en Argentina. null la borra.
const fechaEntregaSchema = z
  .string()
  .transform((dia, ctx) => {
    const fecha = diaArgentinaAFecha(dia);

    if (!fecha) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha de entrega tiene que ser un dia valido (AAAA-MM-DD)" });
      return z.NEVER;
    }

    return fecha;
  })
  .nullable();

export const pedidoParamsSchema = z.object({
  id: idSchema
});

export const pedidoDetalleParamsSchema = z.object({
  id: idSchema,
  detalleId: idSchema
});

export const listarPedidosQuerySchema = paginacionSchema.extend({
  idCliente: idSchema.optional(),
  estadoPedido: z.enum(ESTADOS_PEDIDO).optional(),
  estadoCobro: z.enum(ESTADOS_COBRO).optional()
});

export const crearPedidoSchema = z.object({
  idCliente: idSchema,
  origenPedido: z.enum(ORIGENES_PEDIDO),
  estadoCobro: z.enum(ESTADOS_COBRO).optional(),
  observacionesCliente: z.string().max(2000).optional(),
  observacionesInternas: z.string().max(2000).optional(),
  fechaEntrega: fechaEntregaSchema.optional(),
  activo: z.boolean().optional()
});

export const agregarDetallePedidoSchema = z.object({
  idItemCatalogo: idSchema,
  cantidad: decimalPositivoSchema
});

export const actualizarDetallePedidoSchema = z.object({
  cantidad: decimalPositivoSchema
});

export const actualizarEstadoPedidoSchema = z
  .object({
    estadoPedido: z.enum(ESTADOS_PEDIDO).optional(),
    estadoCobro: z.enum(ESTADOS_COBRO).optional(),
    observacionesInternas: z.string().max(2000).optional(),
    fechaEntrega: fechaEntregaSchema.optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");
