import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Consultas de solo lectura para el panel de inicio. El stock se lee a traves de stockService.
export const panelRepository = {
  contarPedidosPorEstado(prismaOrTx: PrismaOrTx) {
    return prismaOrTx.pedido.groupBy({
      by: ["estadoPedido"],
      where: { activo: true },
      _count: { _all: true }
    });
  },

  listarPedidosPorEstados(prismaOrTx: PrismaOrTx, estados: string[], limit: number) {
    return prismaOrTx.pedido.findMany({
      where: { activo: true, estadoPedido: { in: estados } },
      include: { cliente: { select: { idCliente: true, nombre: true, apellido: true } } },
      orderBy: { idPedido: "desc" },
      take: limit
    });
  },

  contarOrdenesPorEstado(prismaOrTx: PrismaOrTx) {
    return prismaOrTx.ordenProduccion.groupBy({
      by: ["estadoProduccion"],
      where: { activo: true },
      _count: { _all: true }
    });
  },

  listarOrdenesEnProceso(prismaOrTx: PrismaOrTx, limit: number) {
    return prismaOrTx.ordenProduccion.findMany({
      where: { activo: true, estadoProduccion: "EN_PROCESO" },
      include: {
        detalles: {
          include: { itemCatalogoProducto: { select: { idItemCatalogo: true, nombre: true } } },
          orderBy: { idOrdenProduccionDetalle: "asc" }
        }
      },
      orderBy: { fechaInicio: "asc" },
      take: limit
    });
  }
};
