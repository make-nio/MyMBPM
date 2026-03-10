import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export const solicitudesEspecialesRepository = {
  listar(filtros: { idCliente?: bigint; estadoSolicitud?: string; limit: number; offset: number }) {
    return prisma.solicitudEspecial.findMany({
      where: {
        idCliente: filtros.idCliente,
        estadoSolicitud: filtros.estadoSolicitud
      },
      include: {
        cliente: true
      },
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
      include: {
        cliente: true
      }
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
      include: {
        cliente: true
      }
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
      include: {
        cliente: true
      }
    });
  },

  obtenerCliente(prismaOrTx: PrismaOrTx, idCliente: bigint) {
    return prismaOrTx.cliente.findUnique({
      where: { idCliente }
    });
  }
};
