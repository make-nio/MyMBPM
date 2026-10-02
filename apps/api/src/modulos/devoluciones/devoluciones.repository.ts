import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Del usuario que registro la devolucion se muestra el nombre: nunca la clave ni el email.
const usuarioResumido = { select: { idUsuario: true, nombre: true, apellido: true } } as const;

export const devolucionesRepository = {
  listarPorPedido(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    return prismaOrTx.devolucion.findMany({
      where: { idPedido },
      include: {
        usuario: usuarioResumido,
        pagoReintegro: { select: { idPago: true, monto: true, medioPago: true } },
        detalles: {
          include: { pedidoDetalle: { select: { idItemCatalogo: true, nombreItemSnapshot: true } } },
          orderBy: { idDevolucionDetalle: "asc" }
        }
      },
      orderBy: [{ fecha: "asc" }, { idDevolucion: "asc" }]
    });
  },

  // Cuanto se devolvio ya de cada linea del pedido.
  async cantidadesDevueltas(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    const grupos = await prismaOrTx.devolucionDetalle.groupBy({
      by: ["idPedidoDetalle"],
      where: { devolucion: { idPedido } },
      _sum: { cantidad: true }
    });

    return new Map(grupos.map((grupo) => [grupo.idPedidoDetalle, grupo._sum.cantidad ?? new Prisma.Decimal(0)]));
  },

  // Valor devuelto del pedido (suma de los subtotales de sus devoluciones). Lo usa pagos en cada
  // calculo de cobro, tambien dentro de transacciones: en un deploy preview sin la migracion la
  // tabla no existe, y una consulta que falla abortaria la transaccion en Postgres. Por eso se
  // pregunta antes si existe, con una consulta que no falla.
  async valorDevuelto(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    const [tabla] = await prismaOrTx.$queryRaw<Array<{ existe: boolean }>>`
      SELECT to_regclass('"DEVOLUCION_DETALLE"') IS NOT NULL AS existe`;

    if (!tabla?.existe) {
      return new Prisma.Decimal(0);
    }

    const suma = await prismaOrTx.devolucionDetalle.aggregate({
      where: { devolucion: { idPedido } },
      _sum: { subtotal: true }
    });

    return suma._sum.subtotal ?? new Prisma.Decimal(0);
  },

  crear(
    prismaOrTx: PrismaOrTx,
    data: {
      idPedido: bigint;
      motivo: string;
      devuelveStock: boolean;
      idPagoReintegro?: bigint;
      idUsuario?: bigint;
      detalles: Array<{
        idPedidoDetalle: bigint;
        cantidad: Prisma.Decimal;
        precioUnitario: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }>;
    }
  ) {
    const { detalles, ...devolucion } = data;

    return prismaOrTx.devolucion.create({
      data: { ...devolucion, detalles: { create: detalles } },
      include: { detalles: { include: { pedidoDetalle: { select: { idItemCatalogo: true } } } } }
    });
  }
};
