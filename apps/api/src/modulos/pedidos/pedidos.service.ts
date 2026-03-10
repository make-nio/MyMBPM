import { Prisma } from "@prisma/client";

import {
  EstadoCobro,
  EstadoPedido,
  ESTADOS_PEDIDO,
  OrigenPedido
} from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { pedidosRepository } from "./pedidos.repository";

function aDecimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value ?? 0);
}

function construirNumeroPedido(idPedido: bigint) {
  return `PED-${idPedido.toString().padStart(6, "0")}`;
}

export const pedidosService = {
  listar(filtros: {
    idCliente?: bigint;
    estadoPedido?: EstadoPedido;
    estadoCobro?: EstadoCobro;
    limit: number;
    offset: number;
  }) {
    return pedidosRepository.listar(filtros);
  },

  async obtenerPorId(idPedido: bigint) {
    const pedido = await pedidosRepository.obtenerPorId(prisma, idPedido);

    if (!pedido) {
      throw new ErrorNoEncontrado("Pedido no encontrado");
    }

    return pedido;
  },

  async crear(data: {
    idCliente: bigint;
    origenPedido: OrigenPedido;
    estadoCobro?: EstadoCobro;
    observacionesCliente?: string;
    observacionesInternas?: string;
    activo?: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const cliente = await pedidosRepository.obtenerCliente(tx, data.idCliente);

      if (!cliente) {
        throw new ErrorNoEncontrado("Cliente no encontrado");
      }

      const pedido = await pedidosRepository.crear(tx, data);

      return pedidosRepository.actualizar(tx, pedido.idPedido, {
        numeroPedido: construirNumeroPedido(pedido.idPedido)
      });
    });
  },

  async agregarDetalle(idPedido: bigint, data: { idItemCatalogo: bigint; cantidad: number }) {
    return prisma.$transaction(async (tx) => {
      const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedido) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      if (pedido.estadoPedido !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden agregar detalles a pedidos pendientes");
      }

      const item = await pedidosRepository.obtenerItemCatalogo(tx, data.idItemCatalogo);

      if (!item) {
        throw new ErrorNoEncontrado("Item de catalogo no encontrado");
      }

      const cantidad = aDecimal(data.cantidad);
      const precioUnitario = aDecimal(item.precio);
      const costoUnitario = aDecimal(item.costo);
      const subtotalDetalle = precioUnitario.mul(cantidad);

      await pedidosRepository.agregarDetalle(tx, {
        idPedido,
        idItemCatalogo: item.idItemCatalogo,
        nombreItemSnapshot: item.nombre,
        cantidad,
        precioUnitario,
        costoUnitario,
        subtotal: subtotalDetalle
      });

      const pedidoActualizado = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedidoActualizado) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      const subtotal = pedidoActualizado.detalles.reduce(
        (acumulado, detalle) => acumulado.add(detalle.subtotal),
        new Prisma.Decimal(0)
      );

      await pedidosRepository.actualizar(tx, idPedido, {
        subtotal,
        total: subtotal
      });

      return pedidosRepository.obtenerPorId(tx, idPedido);
    });
  },

  async recalcularTotales(prismaOrTx: typeof prisma | Parameters<typeof prisma.$transaction>[0], idPedido: bigint) {
    const pedido = await pedidosRepository.obtenerPorId(prismaOrTx as never, idPedido);

    if (!pedido) {
      throw new ErrorNoEncontrado("Pedido no encontrado");
    }

    const subtotal = pedido.detalles.reduce(
      (acumulado, detalle) => acumulado.add(detalle.subtotal),
      new Prisma.Decimal(0)
    );

    await pedidosRepository.actualizar(prismaOrTx as never, idPedido, {
      subtotal,
      total: subtotal
    });
  },

  async actualizarDetalle(idPedido: bigint, idPedidoDetalle: bigint, data: { cantidad: number }) {
    return prisma.$transaction(async (tx) => {
      const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedido) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      if (pedido.estadoPedido !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden editar detalles de pedidos pendientes");
      }

      const detalle = await pedidosRepository.obtenerDetalle(tx, idPedidoDetalle);

      if (!detalle || detalle.idPedido !== idPedido) {
        throw new ErrorNoEncontrado("Detalle de pedido no encontrado");
      }

      const cantidad = aDecimal(data.cantidad);
      const subtotal = detalle.precioUnitario.mul(cantidad);

      await pedidosRepository.actualizarDetalle(tx, idPedidoDetalle, {
        cantidad,
        subtotal
      });

      await this.recalcularTotales(tx as never, idPedido);
      return pedidosRepository.obtenerPorId(tx, idPedido);
    });
  },

  async eliminarDetalle(idPedido: bigint, idPedidoDetalle: bigint) {
    return prisma.$transaction(async (tx) => {
      const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedido) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      if (pedido.estadoPedido !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden eliminar detalles de pedidos pendientes");
      }

      const detalle = await pedidosRepository.obtenerDetalle(tx, idPedidoDetalle);

      if (!detalle || detalle.idPedido !== idPedido) {
        throw new ErrorNoEncontrado("Detalle de pedido no encontrado");
      }

      await pedidosRepository.eliminarDetalle(tx, idPedidoDetalle);
      await this.recalcularTotales(tx as never, idPedido);

      return pedidosRepository.obtenerPorId(tx, idPedido);
    });
  },

  async actualizarEstado(
    idPedido: bigint,
    data: {
      estadoPedido?: EstadoPedido;
      estadoCobro?: EstadoCobro;
      observacionesInternas?: string;
    }
  ) {
    const pedido = await this.obtenerPorId(idPedido);

    if (data.estadoPedido === "CONFIRMADO") {
      throw new ErrorConflicto("Use el endpoint especifico para confirmar pedidos");
    }

    if (
      data.estadoPedido &&
      !ESTADOS_PEDIDO.includes(data.estadoPedido as (typeof ESTADOS_PEDIDO)[number])
    ) {
      throw new ErrorConflicto("Estado de pedido invalido");
    }

    return pedidosRepository.actualizar(prisma, pedido.idPedido, data);
  },

  async confirmar(idPedido: bigint, idUsuario?: bigint) {
    return prisma.$transaction(async (tx) => {
      const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedido) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      if (pedido.estadoPedido !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se puede confirmar un pedido pendiente");
      }

      if (pedido.detalles.length === 0) {
        throw new ErrorConflicto("El pedido debe tener al menos un detalle");
      }

      for (const detalle of pedido.detalles) {
        await stockService.registrarEgreso(tx, {
          idItemCatalogo: detalle.idItemCatalogo,
          idUsuario,
          tipoStock: "PRODUCTO",
          tipoMovimiento: "EGRESO_PEDIDO",
          cantidad: detalle.cantidad,
          origenMovimiento: "PEDIDO",
          idReferenciaOrigen: pedido.idPedido,
          idReferenciaDetalle: detalle.idPedidoDetalle,
          observaciones: `Confirmacion del pedido ${pedido.numeroPedido ?? pedido.idPedido.toString()}`
        });
      }

      await pedidosRepository.actualizar(tx, pedido.idPedido, {
        estadoPedido: "CONFIRMADO",
        fechaConfirmacion: new Date()
      });

      return pedidosRepository.obtenerPorId(tx, pedido.idPedido);
    });
  }
};
