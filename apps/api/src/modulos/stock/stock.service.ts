import { Prisma, PrismaClient } from "@prisma/client";

import {
  OrigenMovimiento,
  TipoItem,
  TipoMovimiento,
  TipoStock
} from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";

import { prisma } from "../../lib/prisma";

import { stockRepository } from "./stock.repository";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

type RegistrarMovimientoInput = {
  idItemCatalogo: bigint;
  idUsuario?: bigint;
  tipoStock: TipoStock;
  tipoMovimiento: TipoMovimiento;
  cantidad: number | Prisma.Decimal;
  origenMovimiento: OrigenMovimiento;
  idReferenciaOrigen?: bigint;
  idReferenciaDetalle?: bigint;
  observaciones?: string;
};

type RegistrarAjusteManualInput = Omit<RegistrarMovimientoInput, "origenMovimiento" | "tipoMovimiento"> & {
  tipoMovimiento: "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO";
};

// Las operaciones que mueven varios items en una transaccion deben hacerlo en este orden:
// bloquearItem toma un lock por item y, si dos transacciones los toman en distinto orden,
// PostgreSQL aborta una por deadlock.
export function ordenarPorItem<T>(elementos: T[], idItem: (elemento: T) => bigint) {
  return [...elementos].sort((a, b) => (idItem(a) < idItem(b) ? -1 : idItem(a) > idItem(b) ? 1 : 0));
}

function aDecimal(value: number | Prisma.Decimal | string) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export const stockService = {
  async obtenerStockActual(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint, tipoStock: TipoStock) {
    const ultimoEstado = await stockRepository.obtenerUltimoEstado(
      prismaOrTx,
      idItemCatalogo,
      tipoStock
    );

    return {
      idItemCatalogo,
      tipoStock,
      stockActual: ultimoEstado?.stockActual ?? new Prisma.Decimal(0),
      ultimoMovimiento: ultimoEstado ?? null
    };
  },

  obtenerHistorial(
    prismaOrTx: PrismaOrTx,
    filtros: { idItemCatalogo: bigint; tipoStock?: TipoStock; limit: number; offset: number }
  ) {
    return stockRepository.listarHistorial(prismaOrTx, filtros);
  },

  // Stock vigente de cada item del catalogo: los PRODUCTO contra su stock de PRODUCTO y los
  // INSUMO contra su stock de INSUMO.
  async obtenerExistencias(prismaOrTx: PrismaOrTx, filtros: { tipoItem?: TipoItem; activo?: boolean }) {
    const items = await stockRepository.listarItemsParaExistencias(prismaOrTx, filtros);
    const ultimos = await stockRepository.listarUltimosEstados(
      prismaOrTx,
      items.map((item) => item.idItemCatalogo)
    );
    const porItemYTipo = new Map(
      ultimos.map((estado) => [`${estado.idItemCatalogo}:${estado.tipoStock}`, estado])
    );

    return items.map((item) => {
      const ultimo = porItemYTipo.get(`${item.idItemCatalogo}:${item.tipoItem}`) ?? null;
      const stockActual = ultimo ? new Prisma.Decimal(ultimo.stockActual) : new Prisma.Decimal(0);

      return {
        idItemCatalogo: item.idItemCatalogo,
        nombre: item.nombre,
        tipoItem: item.tipoItem,
        tipoStock: item.tipoItem,
        activo: item.activo,
        categoria: item.categoria,
        stockMinimo: item.stockMinimo,
        stockActual,
        bajoMinimo: item.stockMinimo > 0 && stockActual.lessThanOrEqualTo(item.stockMinimo),
        fechaUltimoMovimiento: ultimo?.fechaAlta ?? null
      };
    });
  },

  obtenerUltimosMovimientos(prismaOrTx: PrismaOrTx, limit: number) {
    return stockRepository.listarUltimosMovimientos(prismaOrTx, limit);
  },

  async obtenerBajoStock(
    prismaOrTx: PrismaOrTx,
    filtros: { activo?: boolean; limit: number; offset: number }
  ) {
    const existencias = await this.obtenerExistencias(prismaOrTx, { activo: filtros.activo });

    return existencias
      .filter((item) => item.bajoMinimo)
      .slice(filtros.offset, filtros.offset + filtros.limit);
  },

  async validarItemExiste(prismaOrTx: PrismaOrTx, idItemCatalogo: bigint) {
    const item = await stockRepository.obtenerItem(prismaOrTx, idItemCatalogo);

    if (!item) {
      throw new ErrorNoEncontrado("Item de catalogo no encontrado");
    }

    return item;
  },

  async validarStockDisponible(
    prismaOrTx: PrismaOrTx,
    idItemCatalogo: bigint,
    tipoStock: TipoStock,
    cantidad: number | Prisma.Decimal
  ) {
    const cantidadDecimal = aDecimal(cantidad);
    const stock = await this.obtenerStockActual(prismaOrTx, idItemCatalogo, tipoStock);

    if (stock.stockActual.lessThan(cantidadDecimal)) {
      throw new ErrorConflicto("Stock insuficiente para realizar la operacion", {
        idItemCatalogo: idItemCatalogo.toString(),
        tipoStock,
        stockActual: stock.stockActual.toString(),
        cantidadSolicitada: cantidadDecimal.toString()
      });
    }

    return stock;
  },

  async validarIdempotencia(prismaOrTx: PrismaOrTx, input: RegistrarMovimientoInput) {
    if (input.origenMovimiento === "MANUAL") {
      return null;
    }

    return stockRepository.buscarMovimientoDuplicado(prismaOrTx, {
      origenMovimiento: input.origenMovimiento,
      idReferenciaOrigen: input.idReferenciaOrigen,
      idReferenciaDetalle: input.idReferenciaDetalle,
      idItemCatalogo: input.idItemCatalogo,
      tipoMovimiento: input.tipoMovimiento
    });
  },

  async registrarIngreso(prismaOrTx: PrismaOrTx, input: RegistrarMovimientoInput) {
    await this.validarItemExiste(prismaOrTx, input.idItemCatalogo);
    await stockRepository.bloquearItem(prismaOrTx, input.idItemCatalogo, input.tipoStock);

    const movimientoDuplicado = await this.validarIdempotencia(prismaOrTx, input);

    if (movimientoDuplicado) {
      return movimientoDuplicado;
    }

    const cantidad = aDecimal(input.cantidad);
    const stock = await this.obtenerStockActual(prismaOrTx, input.idItemCatalogo, input.tipoStock);
    const stockActual = stock.stockActual.add(cantidad);

    return stockRepository.crearMovimiento(prismaOrTx, {
      idItemCatalogo: input.idItemCatalogo,
      idUsuario: input.idUsuario,
      tipoStock: input.tipoStock,
      stockActual,
      stockAnterior: stock.stockActual,
      tipoMovimiento: input.tipoMovimiento,
      cantidadMovimiento: cantidad,
      origenMovimiento: input.origenMovimiento,
      idReferenciaOrigen: input.idReferenciaOrigen,
      idReferenciaDetalle: input.idReferenciaDetalle,
      observaciones: input.observaciones
    });
  },

  async registrarEgreso(prismaOrTx: PrismaOrTx, input: RegistrarMovimientoInput) {
    await this.validarItemExiste(prismaOrTx, input.idItemCatalogo);
    await stockRepository.bloquearItem(prismaOrTx, input.idItemCatalogo, input.tipoStock);

    const movimientoDuplicado = await this.validarIdempotencia(prismaOrTx, input);

    if (movimientoDuplicado) {
      return movimientoDuplicado;
    }

    const cantidad = aDecimal(input.cantidad);
    const stock = await this.validarStockDisponible(
      prismaOrTx,
      input.idItemCatalogo,
      input.tipoStock,
      cantidad
    );
    const stockActual = stock.stockActual.sub(cantidad);

    return stockRepository.crearMovimiento(prismaOrTx, {
      idItemCatalogo: input.idItemCatalogo,
      idUsuario: input.idUsuario,
      tipoStock: input.tipoStock,
      stockActual,
      stockAnterior: stock.stockActual,
      tipoMovimiento: input.tipoMovimiento,
      cantidadMovimiento: cantidad,
      origenMovimiento: input.origenMovimiento,
      idReferenciaOrigen: input.idReferenciaOrigen,
      idReferenciaDetalle: input.idReferenciaDetalle,
      observaciones: input.observaciones
    });
  },

  registrarReverso(prismaOrTx: PrismaOrTx, input: RegistrarMovimientoInput) {
    return this.registrarIngreso(prismaOrTx, {
      ...input,
      tipoMovimiento: "REVERSO"
    });
  },

  // Ajuste manual pedido por un usuario (POST /api/stock/ajustes), en su propia transaccion.
  crearAjusteManual(input: RegistrarAjusteManualInput) {
    return prisma.$transaction((tx) => this.registrarAjusteManual(tx, input));
  },

  registrarAjusteManual(
    prismaOrTx: PrismaOrTx,
    input: RegistrarAjusteManualInput
  ) {
    if (input.tipoMovimiento === "AJUSTE_NEGATIVO") {
      return this.registrarEgreso(prismaOrTx, {
        ...input,
        origenMovimiento: "MANUAL"
      });
    }

    if (input.tipoMovimiento !== "AJUSTE_POSITIVO") {
      throw new ErrorConflicto("El ajuste manual solo permite AJUSTE_POSITIVO o AJUSTE_NEGATIVO");
    }

    return this.registrarIngreso(prismaOrTx, {
      ...input,
      origenMovimiento: "MANUAL",
      tipoMovimiento: "AJUSTE_POSITIVO"
    });
  }
};
