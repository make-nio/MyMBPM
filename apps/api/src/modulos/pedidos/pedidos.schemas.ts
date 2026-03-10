import { z } from "zod";

import {
  ESTADOS_COBRO,
  ESTADOS_PEDIDO,
  ORIGENES_PEDIDO
} from "../../compartido/dominio/enums";
import { idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";

const decimalPositivoSchema = z.coerce.number().positive();

export const pedidoParamsSchema = z.object({
  id: idSchema
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
  activo: z.boolean().optional()
});

export const agregarDetallePedidoSchema = z.object({
  idItemCatalogo: idSchema,
  cantidad: decimalPositivoSchema
});

export const actualizarEstadoPedidoSchema = z
  .object({
    estadoPedido: z.enum(ESTADOS_PEDIDO).optional(),
    estadoCobro: z.enum(ESTADOS_COBRO).optional(),
    observacionesInternas: z.string().max(2000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Debe enviar al menos un campo para actualizar");

export const confirmarPedidoSchema = z.object({
  idUsuario: idSchema.optional()
});
