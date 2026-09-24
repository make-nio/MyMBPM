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
  }
};
