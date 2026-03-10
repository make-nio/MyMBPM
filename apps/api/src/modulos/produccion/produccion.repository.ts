import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

type ListarOrdenesProduccionFiltros = {
  estadoProduccion?: string;
  limit: number;
  offset: number;
};

export const produccionRepository = {
  listar(filtros: ListarOrdenesProduccionFiltros) {
    return prisma.ordenProduccion.findMany({
      where: {
        estadoProduccion: filtros.estadoProduccion
      },
      include: {
        detalles: true,
        consumos: true
      },
      orderBy: {
        idOrdenProduccion: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  obtenerPorId(prismaOrTx: PrismaOrTx, idOrdenProduccion: bigint) {
    return prismaOrTx.ordenProduccion.findUnique({
      where: { idOrdenProduccion },
      include: {
        detalles: {
          include: {
            itemCatalogoProducto: true
          },
          orderBy: {
            idOrdenProduccionDetalle: "asc"
          }
        },
        consumos: {
          include: {
            itemCatalogoInsumo: true
          },
          orderBy: {
            idOrdenProduccionConsumo: "asc"
          }
        }
      }
    });
  },

  crear(prismaOrTx: PrismaOrTx, data: { observaciones?: string; activo?: boolean }) {
    return prismaOrTx.ordenProduccion.create({
      data: {
        observaciones: data.observaciones,
        activo: data.activo ?? true
      }
    });
  },

  agregarDetalle(
    prismaOrTx: PrismaOrTx,
    data: {
      idOrdenProduccion: bigint;
      idItemCatalogoProducto: bigint;
      cantidad: Prisma.Decimal;
      observaciones?: string;
    }
  ) {
    return prismaOrTx.ordenProduccionDetalle.create({
      data
    });
  },

  actualizar(
    prismaOrTx: PrismaOrTx,
    idOrdenProduccion: bigint,
    data: Partial<{
      estadoProduccion: string;
      observaciones?: string;
      fechaInicio: Date;
      fechaFin: Date;
      activo: boolean;
    }>
  ) {
    return prismaOrTx.ordenProduccion.update({
      where: { idOrdenProduccion },
      data
    });
  },

  obtenerItemCatalogo(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint) {
    return prismaOrTx.itemCatalogo.findUnique({
      where: { idItemCatalogo }
    });
  },

  obtenerComponentesActivos(prismaOrTx: PrismaOrTx, idItemCatalogoPadre: bigint) {
    return prismaOrTx.itemCatalogoComponente.findMany({
      where: {
        idItemCatalogoPadre,
        activo: true
      },
      include: {
        itemCatalogoComponente: true
      },
      orderBy: {
        idItemCatalogoComponente: "asc"
      }
    });
  },

  crearConsumos(
    prismaOrTx: PrismaOrTx,
    data: Array<{
      idOrdenProduccion: bigint;
      idItemCatalogoInsumo: bigint;
      cantidad: Prisma.Decimal;
    }>
  ) {
    return prismaOrTx.ordenProduccionConsumo.createMany({
      data
    });
  }
};
