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

  // Pedidos abiertos con fecha de entrega prometida antes de `hasta`, los mas urgentes primero.
  listarPedidosConEntregaAntesDe(prismaOrTx: PrismaOrTx, estados: string[], hasta: Date) {
    return prismaOrTx.pedido.findMany({
      where: { activo: true, estadoPedido: { in: estados }, fechaEntrega: { lt: hasta } },
      include: { cliente: { select: { idCliente: true, nombre: true, apellido: true } } },
      orderBy: [{ fechaEntrega: "asc" }, { idPedido: "asc" }]
    });
  },

  // Cuantos pedidos abiertos tienen la entrega prometida en [desde, hasta). Sin desde: todo lo
  // anterior a hasta.
  contarPedidosConEntregaEntre(prismaOrTx: PrismaOrTx, estados: string[], hasta: Date, desde?: Date) {
    return prismaOrTx.pedido.count({
      where: { activo: true, estadoPedido: { in: estados }, fechaEntrega: { gte: desde, lt: hasta } }
    });
  },

  contarOrdenesPorEstado(prismaOrTx: PrismaOrTx) {
    return prismaOrTx.ordenProduccion.groupBy({
      by: ["estadoProduccion"],
      where: { activo: true },
      _count: { _all: true }
    });
  },

  // Pedidos confirmados en el rango (no cancelados): lo vendido. Solo los campos para sumar.
  listarPedidosConfirmadosEntre(prismaOrTx: PrismaOrTx, desde: Date, hasta: Date) {
    return prismaOrTx.pedido.findMany({
      where: {
        activo: true,
        estadoPedido: { not: "CANCELADO" },
        fechaConfirmacion: { gte: desde, lt: hasta }
      },
      select: {
        total: true,
        detalles: { select: { cantidad: true, costoUnitario: true } }
      }
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
