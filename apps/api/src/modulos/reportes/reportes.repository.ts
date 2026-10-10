import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export const reportesRepository = {
  // Lo vendido en el rango, con el mismo criterio que el panel: pedidos activos confirmados en
  // el rango y no cancelados. Solo los campos para agrupar por item y por cliente.
  listarPedidosVendidosEntre(prismaOrTx: PrismaOrTx, desde: Date, hasta: Date) {
    return prismaOrTx.pedido.findMany({
      where: {
        activo: true,
        estadoPedido: { not: "CANCELADO" },
        fechaConfirmacion: { gte: desde, lt: hasta }
      },
      select: {
        idPedido: true,
        total: true,
        cliente: { select: { idCliente: true, nombre: true, apellido: true } },
        detalles: {
          select: {
            idItemCatalogo: true,
            nombreItemSnapshot: true,
            cantidad: true,
            costoUnitario: true,
            subtotal: true,
            itemCatalogo: { select: { nombre: true } }
          }
        }
      }
    });
  },

  // Solo el total y el dia de confirmacion: para sumar lo vendido por mes (grafico de 12 meses).
  listarTotalesVendidosEntre(prismaOrTx: PrismaOrTx, desde: Date, hasta: Date) {
    return prismaOrTx.pedido.findMany({
      where: {
        activo: true,
        estadoPedido: { not: "CANCELADO" },
        fechaConfirmacion: { gte: desde, lt: hasta }
      },
      select: { total: true, fechaConfirmacion: true }
    });
  },

  // Valor de lo devuelto en el rango (segun la fecha de la devolucion) y cuantas devoluciones.
  // En un deploy preview sin la migracion de #96 la tabla no existe: cero, y el reporte sigue.
  async devueltoEntre(prismaOrTx: PrismaOrTx, desde: Date, hasta: Date) {
    const [tabla] = await prismaOrTx.$queryRaw<Array<{ existe: boolean }>>`
      SELECT to_regclass('"DEVOLUCION"') IS NOT NULL AS existe`;

    if (!tabla?.existe) {
      return { valor: new Prisma.Decimal(0), devoluciones: 0 };
    }

    const rango = { fecha: { gte: desde, lt: hasta } };
    const [suma, devoluciones] = await Promise.all([
      prismaOrTx.devolucionDetalle.aggregate({ where: { devolucion: rango }, _sum: { subtotal: true } }),
      prismaOrTx.devolucion.count({ where: rango })
    ]);

    return { valor: suma._sum.subtotal ?? new Prisma.Decimal(0), devoluciones };
  },

  // Lo cobrado en el rango por medio de pago: pagos vigentes (sin anulados) segun su fecha.
  cobradoPorMedioEntre(prismaOrTx: PrismaOrTx, desde: Date, hasta: Date) {
    return prismaOrTx.pago.groupBy({
      by: ["medioPago"],
      where: { anulado: false, fecha: { gte: desde, lt: hasta } },
      _sum: { monto: true },
      _count: { _all: true },
      orderBy: { medioPago: "asc" }
    });
  }
};
