import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

type ListarPedidosFiltros = {
  idCliente?: bigint;
  estadoPedido?: string;
  estadoCobro?: string;
  limit: number;
  offset: number;
};

type CrearPedidoInput = {
  idCliente: bigint;
  origenPedido: string;
  estadoCobro?: string;
  observacionesCliente?: string;
  observacionesInternas?: string;
  activo?: boolean;
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
  fechaEntrega: Date;
  activo: boolean;
}>;

export const pedidosRepository = {
  listar(filtros: ListarPedidosFiltros) {
    return prisma.pedido.findMany({
      where: {
        idCliente: filtros.idCliente,
        estadoPedido: filtros.estadoPedido,
        estadoCobro: filtros.estadoCobro
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
        activo: input.activo ?? true,
        subtotal: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0)
      }
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

  obtenerCliente(prismaOrTx: PrismaOrTx, idCliente: bigint) {
    return prismaOrTx.cliente.findUnique({
      where: { idCliente }
    });
  }
};
