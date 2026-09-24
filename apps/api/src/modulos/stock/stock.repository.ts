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

export type UltimoEstadoStock = {
  idItemCatalogo: bigint;
  tipoStock: string;
  stockActual: Prisma.Decimal;
  fechaAlta: Date;
};

type ListarHistorialFiltros = {
  idItemCatalogo: bigint;
  tipoStock?: string;
  origenMovimiento?: string;
  idReferenciaOrigen?: bigint;
  limit: number;
  offset: number;
};

// Datos del usuario que se devuelven junto a un movimiento. Nunca incluir claveHash: el
// historial lo ve cualquier usuario autenticado.
export const usuarioDelMovimiento = {
  idUsuario: true,
  nombre: true,
  apellido: true
} satisfies Prisma.UsuarioSelect;

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
        tipoStock: filtros.tipoStock,
        origenMovimiento: filtros.origenMovimiento,
        idReferenciaOrigen: filtros.idReferenciaOrigen
      },
      include: {
        usuario: { select: usuarioDelMovimiento }
      },
      orderBy: {
        idEstadoStock: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  // Ultimos movimientos de cualquier item (panel de inicio).
  listarUltimosMovimientos(prismaOrTx: PrismaOrTx, limit: number) {
    return prismaOrTx.estadoStock.findMany({
      include: {
        itemCatalogo: { select: { idItemCatalogo: true, nombre: true, tipoItem: true } },
        usuario: { select: usuarioDelMovimiento }
      },
      orderBy: {
        idEstadoStock: "desc"
      },
      take: limit
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
  },

  listarItemsParaExistencias(prismaOrTx: PrismaOrTx, filtros: { tipoItem?: string; activo?: boolean }) {
    return prismaOrTx.itemCatalogo.findMany({
      where: {
        tipoItem: filtros.tipoItem,
        activo: filtros.activo
      },
      include: {
        categoria: true
      },
      orderBy: [{ tipoItem: "asc" }, { nombre: "asc" }]
    });
  },

  // Ultimo ESTADO_STOCK por item y tipo de stock (el stock vigente), en una sola consulta.
  // DISTINCT ON es de PostgreSQL; usa el indice por ID_ITEM_CATALOGO.
  listarUltimosEstados(prismaOrTx: PrismaOrTx, idsItemCatalogo: bigint[]) {
    if (idsItemCatalogo.length === 0) {
      return Promise.resolve([] as UltimoEstadoStock[]);
    }

    return prismaOrTx.$queryRaw<UltimoEstadoStock[]>`
      SELECT DISTINCT ON ("ID_ITEM_CATALOGO", "TIPO_STOCK")
        "ID_ITEM_CATALOGO" AS "idItemCatalogo",
        "TIPO_STOCK" AS "tipoStock",
        "STOCK_ACTUAL" AS "stockActual",
        "FECHA_ALTA" AS "fechaAlta"
      FROM "ESTADO_STOCK"
      WHERE "ID_ITEM_CATALOGO" IN (${Prisma.join(idsItemCatalogo)})
      ORDER BY "ID_ITEM_CATALOGO", "TIPO_STOCK", "ID_ESTADO_STOCK" DESC
    `;
  },

  // Serializa los movimientos de un mismo item y tipo de stock hasta el fin de la transaccion.
  // Sin esto, dos operaciones concurrentes leen el mismo stock anterior y se pisan (o egresan
  // stock que no hay). Solo tiene efecto dentro de una transaccion.
  async bloquearItem(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint, tipoStock: string) {
    const clave = `stock:${tipoStock}:${idItemCatalogo.toString()}`;
    await prismaOrTx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
  }
};
