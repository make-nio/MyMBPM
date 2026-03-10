import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

type BuscarMovimientoDuplicadoInput = {
  origenMovimiento: string;
  idReferenciaOrigen?: bigint;
  idReferenciaDetalle?: bigint;
  idItemCatalogo: bigint;
  tipoMovimiento: string;
};

type CrearMovimientoInput = {
  idItemCatalogo: bigint;
  idUsuario?: bigint;
  tipoStock: string;
  stockActual: Prisma.Decimal;
  stockAnterior: Prisma.Decimal;
  tipoMovimiento: string;
  cantidadMovimiento: Prisma.Decimal;
  origenMovimiento: string;
  idReferenciaOrigen?: bigint;
  idReferenciaDetalle?: bigint;
  observaciones?: string;
};

type ListarHistorialFiltros = {
  idItemCatalogo: bigint;
  tipoStock?: string;
  limit: number;
  offset: number;
};

export const stockRepository = {
  obtenerUltimoEstado(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint, tipoStock: string) {
    return prismaOrTx.estadoStock.findFirst({
      where: {
        idItemCatalogo,
        tipoStock
      },
      orderBy: {
        idEstadoStock: "desc"
      }
    });
  },

  listarHistorial(prismaOrTx: PrismaOrTx, filtros: ListarHistorialFiltros) {
    return prismaOrTx.estadoStock.findMany({
      where: {
        idItemCatalogo: filtros.idItemCatalogo,
        tipoStock: filtros.tipoStock
      },
      include: {
        usuario: true
      },
      orderBy: {
        idEstadoStock: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  buscarMovimientoDuplicado(prismaOrTx: PrismaOrTx, input: BuscarMovimientoDuplicadoInput) {
    return prismaOrTx.estadoStock.findFirst({
      where: {
        origenMovimiento: input.origenMovimiento,
        idReferenciaOrigen: input.idReferenciaOrigen,
        idReferenciaDetalle: input.idReferenciaDetalle,
        idItemCatalogo: input.idItemCatalogo,
        tipoMovimiento: input.tipoMovimiento
      },
      orderBy: {
        idEstadoStock: "desc"
      }
    });
  },

  crearMovimiento(prismaOrTx: PrismaOrTx, input: CrearMovimientoInput) {
    return prismaOrTx.estadoStock.create({
      data: {
        idItemCatalogo: input.idItemCatalogo,
        idUsuario: input.idUsuario,
        tipoStock: input.tipoStock,
        stockActual: input.stockActual,
        stockAnterior: input.stockAnterior,
        tipoMovimiento: input.tipoMovimiento,
        cantidadMovimiento: input.cantidadMovimiento,
        origenMovimiento: input.origenMovimiento,
        idReferenciaOrigen: input.idReferenciaOrigen,
        idReferenciaDetalle: input.idReferenciaDetalle,
        observaciones: input.observaciones
      }
    });
  },

  obtenerItem(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint) {
    return prismaOrTx.itemCatalogo.findUnique({
      where: { idItemCatalogo }
    });
  }
};
