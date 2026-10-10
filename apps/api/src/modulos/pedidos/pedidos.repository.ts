import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

type ListarPedidosFiltros = {
  idCliente?: bigint;
  estadoPedido?: string;
  estadoCobro?: string;
  // Fecha de alta: desde incluida, hasta excluida.
  desde?: Date;
  hasta?: Date;
  limit: number;
  offset: number;
};

type CrearPedidoInput = {
  idCliente: bigint;
  origenPedido: string;
  estadoCobro?: string;
  observacionesCliente?: string;
  observacionesInternas?: string;
  fechaEntrega?: Date | null;
  activo?: boolean;
  idUsuarioAlta?: bigint;
};

// Un cambio de estado para HISTORIAL_ESTADO_PEDIDO (#99). Sin estado anterior es el alta.
export type CambioEstadoInput = {
  idPedido: bigint;
  estadoAnterior: string | null;
  estadoNuevo: string;
  idUsuario?: bigint;
  origen?: string;
  observacion?: string;
  fecha?: Date;
};

type ActualizarPedidoInput = Partial<{
  numeroPedido: string;
  estadoPedido: string;
  estadoCobro: string;
  observacionesInternas?: string;
  observacionesCliente?: string;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  fechaConfirmacion: Date;
  fechaEntrega: Date | null;
  fechaEntregaReal: Date;
  motivoCancelacion: string;
  activo: boolean;
}>;

export const pedidosRepository = {
  listar(filtros: ListarPedidosFiltros) {
    return prisma.pedido.findMany({
      where: {
        idCliente: filtros.idCliente,
        estadoPedido: filtros.estadoPedido,
        estadoCobro: filtros.estadoCobro,
        fechaAlta: filtros.desde || filtros.hasta ? { gte: filtros.desde, lt: filtros.hasta } : undefined
      },
      include: {
        cliente: true
      },
      orderBy: {
        idPedido: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  obtenerPorId(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    return prismaOrTx.pedido.findUnique({
      where: { idPedido },
      include: {
        cliente: true,
        detalles: {
          include: {
            itemCatalogo: true
          },
          orderBy: {
            idPedidoDetalle: "asc"
          }
        }
      }
    });
  },

  crear(prismaOrTx: PrismaOrTx, input: CrearPedidoInput) {
    return prismaOrTx.pedido.create({
      data: {
        idCliente: input.idCliente,
        origenPedido: input.origenPedido,
        estadoCobro: input.estadoCobro ?? "PENDIENTE",
        observacionesCliente: input.observacionesCliente,
        observacionesInternas: input.observacionesInternas,
        fechaEntrega: input.fechaEntrega,
        idUsuarioAlta: input.idUsuarioAlta,
        activo: input.activo ?? true,
        subtotal: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0)
      }
    });
  },

  registrarCambioEstado(prismaOrTx: PrismaOrTx, input: CambioEstadoInput) {
    return prismaOrTx.historialEstadoPedido.create({
      data: {
        idPedido: input.idPedido,
        estadoAnterior: input.estadoAnterior,
        estadoNuevo: input.estadoNuevo,
        idUsuario: input.idUsuario,
        origen: input.origen ?? "PANTALLA",
        observacion: input.observacion?.slice(0, 500),
        fecha: input.fecha
      }
    });
  },

  // Los cambios de estado de un pedido, del primero al ultimo, con el nombre de quien los hizo
  // (nunca el email ni la clave).
  listarHistorial(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    return prismaOrTx.historialEstadoPedido.findMany({
      where: { idPedido },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      orderBy: [{ fecha: "asc" }, { idHistorialEstadoPedido: "asc" }]
    });
  },

  actualizar(prismaOrTx: PrismaOrTx, idPedido: bigint, input: ActualizarPedidoInput) {
    return prismaOrTx.pedido.update({
      where: { idPedido },
      data: input
    });
  },

  agregarDetalle(
    prismaOrTx: PrismaOrTx,
    input: {
      idPedido: bigint;
      idItemCatalogo: bigint;
      nombreItemSnapshot: string;
      cantidad: Prisma.Decimal;
      precioUnitario: Prisma.Decimal;
      costoUnitario: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }
  ) {
    return prismaOrTx.pedidoDetalle.create({
      data: input
    });
  },

  obtenerDetalle(prismaOrTx: PrismaOrTx, idPedidoDetalle: bigint) {
    return prismaOrTx.pedidoDetalle.findUnique({
      where: { idPedidoDetalle }
    });
  },

  actualizarDetalle(
    prismaOrTx: PrismaOrTx,
    idPedidoDetalle: bigint,
    data: Partial<{
      cantidad: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }>
  ) {
    return prismaOrTx.pedidoDetalle.update({
      where: { idPedidoDetalle },
      data
    });
  },

  eliminarDetalle(prismaOrTx: PrismaOrTx, idPedidoDetalle: bigint) {
    return prismaOrTx.pedidoDetalle.delete({
      where: { idPedidoDetalle }
    });
  },

  obtenerItemCatalogo(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint) {
    return prismaOrTx.itemCatalogo.findUnique({
      where: { idItemCatalogo }
    });
  },

  obtenerItemsCatalogo(prismaOrTx: PrismaOrTx, idsItemCatalogo: bigint[]) {
    return prismaOrTx.itemCatalogo.findMany({
      where: { idItemCatalogo: { in: idsItemCatalogo } }
    });
  },

  obtenerCliente(prismaOrTx: PrismaOrTx, idCliente: bigint) {
    return prismaOrTx.cliente.findUnique({
      where: { idCliente }
    });
  }
};
