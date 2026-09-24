import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// El cliente y, si se convirtio, el numero del pedido creado.
const incluirSolicitud = {
  cliente: true,
  pedido: { select: { idPedido: true, numeroPedido: true } }
} satisfies Prisma.SolicitudEspecialInclude;

// Estados desde los que se puede convertir en pedido.
export const ESTADOS_CONVERTIBLES = ["PENDIENTE", "EN_REVISION", "APROBADA"];

export const solicitudesEspecialesRepository = {
  listar(filtros: { idCliente?: bigint; estadoSolicitud?: string; limit: number; offset: number }) {
    return prisma.solicitudEspecial.findMany({
      where: {
        idCliente: filtros.idCliente,
        estadoSolicitud: filtros.estadoSolicitud
      },
      include: incluirSolicitud,
      orderBy: {
        idSolicitudEspecial: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  obtenerPorId(prismaOrTx: PrismaOrTx, idSolicitudEspecial: bigint) {
    return prismaOrTx.solicitudEspecial.findUnique({
      where: { idSolicitudEspecial },
      include: incluirSolicitud
    });
  },

  crear(
    prismaOrTx: PrismaOrTx,
    data: {
      idCliente?: bigint;
      nombreSolicitante: string;
      telefono?: string;
      email?: string;
      descripcion: string;
      estadoSolicitud?: string;
      observaciones?: string;
    }
  ) {
    return prismaOrTx.solicitudEspecial.create({
      data: {
        ...data,
        estadoSolicitud: data.estadoSolicitud ?? "PENDIENTE"
      },
      include: incluirSolicitud
    });
  },

  actualizar(
    prismaOrTx: PrismaOrTx,
    idSolicitudEspecial: bigint,
    data: Partial<{
      idCliente?: bigint | null;
      nombreSolicitante: string;
      telefono?: string | null;
      email?: string | null;
      descripcion: string;
      estadoSolicitud: string;
      observaciones?: string | null;
    }>
  ) {
    return prismaOrTx.solicitudEspecial.update({
      where: { idSolicitudEspecial },
      data,
      include: incluirSolicitud
    });
  },

  // Marca la solicitud como convertida solo si todavia se puede. La condicion la vuelve a evaluar
  // Postgres al tomar el lock de la fila: de dos conversiones simultaneas, una sola actualiza.
  async marcarConvertida(tx: Prisma.TransactionClient, idSolicitudEspecial: bigint, idPedido: bigint) {
    const resultado = await tx.solicitudEspecial.updateMany({
      where: { idSolicitudEspecial, idPedido: null, estadoSolicitud: { in: ESTADOS_CONVERTIBLES } },
      data: { idPedido, estadoSolicitud: "CONVERTIDA_A_PEDIDO" }
    });

    return resultado.count === 1;
  },

  obtenerCliente(prismaOrTx: PrismaOrTx, idCliente: bigint) {
    return prismaOrTx.cliente.findUnique({
      where: { idCliente }
    });
  }
};
