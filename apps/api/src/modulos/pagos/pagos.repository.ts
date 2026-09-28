import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Del usuario que registro o anulo un pago se muestra el nombre: nunca la clave ni el email.
const usuarioResumido = { select: { idUsuario: true, nombre: true, apellido: true } } as const;

export const pagosRepository = {
  listarPorPedido(prismaOrTx: PrismaOrTx, idPedido: bigint) {
    return prismaOrTx.pago.findMany({
      where: { idPedido },
      include: { usuario: usuarioResumido, usuarioAnulacion: usuarioResumido },
      orderBy: [{ fecha: "asc" }, { idPago: "asc" }]
    });
  },

  obtenerPorId(prismaOrTx: PrismaOrTx, idPago: bigint) {
    return prismaOrTx.pago.findUnique({ where: { idPago } });
  },

  crear(
    prismaOrTx: PrismaOrTx,
    data: {
      idPedido: bigint;
      fecha: Date;
      monto: Prisma.Decimal;
      medioPago: string;
      observaciones?: string;
      idUsuario?: bigint;
    }
  ) {
    return prismaOrTx.pago.create({ data });
  },

  anular(prismaOrTx: PrismaOrTx, idPago: bigint, data: { motivo: string; idUsuario?: bigint; fecha: Date }) {
    return prismaOrTx.pago.update({
      where: { idPago },
      data: {
        anulado: true,
        fechaAnulacion: data.fecha,
        motivoAnulacion: data.motivo,
        idUsuarioAnulacion: data.idUsuario
      }
    });
  },

  // Lock de la fila del pedido hasta el fin de la transaccion: dos pagos a la vez sobre el mismo
  // pedido se serializan y no pueden pasar entre los dos el total.
  async bloquearPedido(tx: Prisma.TransactionClient, idPedido: bigint) {
    await tx.$queryRaw`SELECT 1 FROM "PEDIDO" WHERE "ID_PEDIDO" = ${idPedido} FOR UPDATE`;
  }
};
