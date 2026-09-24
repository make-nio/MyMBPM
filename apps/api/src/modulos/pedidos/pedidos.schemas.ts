import { z } from "zod";

import {
  ESTADOS_COBRO,
  ESTADOS_PEDIDO,
  ORIGENES_PEDIDO
} from "../../compartido/dominio/enums";
import { diaArgentinaAFecha } from "../../compartido/dominio/fecha-argentina";
import { cantidadSchema, idSchema, paginacionSchema } from "../../compartido/validaciones/esquemas-comunes";
import { diaDesdeSchema, diaHastaSchema } from "../../compartido/validaciones/esquemas-fechas";

const decimalPositivoSchema = cantidadSchema;

// Fecha de entrega prometida al cliente: un dia ("2026-09-30"), sin hora. Se guarda como las
// 00:00 de ese dia en Argentina. null la borra.
const fechaEntregaSchema = z
  .string()
  .max(10)
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

// desde y hasta filtran por fecha de alta, los dos dias incluidos (hora de Argentina).
export const listarPedidosQuerySchema = paginacionSchema
  .extend({
    idCliente: idSchema.optional(),
    estadoPedido: z.enum(ESTADOS_PEDIDO).optional(),
    estadoCobro: z.enum(ESTADOS_COBRO).optional(),
    desde: diaDesdeSchema.optional(),
    hasta: diaHastaSchema.optional()
  })
  .refine((filtros) => !filtros.desde || !filtros.hasta || filtros.desde < filtros.hasta, {
    message: "La fecha desde no puede ser posterior a la fecha hasta",
    path: ["desde"]
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
