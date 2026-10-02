import { Prisma } from "@prisma/client";

import { calcularEstadoCobro } from "../../compartido/dominio/cobro";
import { MedioPago } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { devolucionesRepository } from "../devoluciones/devoluciones.repository";
import { pedidosRepository } from "../pedidos/pedidos.repository";

import { pagosRepository } from "./pagos.repository";

type Pagos = Awaited<ReturnType<typeof pagosRepository.listarPorPedido>>;

// Lo cobrado neto: pagos vigentes menos reintegros (los reintegros de una devolucion son pagos
// con monto negativo, #96).
function sumarVigentes(pagos: Pagos) {
  return pagos.filter((pago) => !pago.anulado).reduce((suma, pago) => suma.add(pago.monto), new Prisma.Decimal(0));
}

// Lo que hay que cobrar es el total menos lo devuelto (valor de las lineas que volvieron).
function resumen(total: Prisma.Decimal, devuelto: Prisma.Decimal, estadoCobro: string, pagos: Pagos) {
  const cobrado = sumarVigentes(pagos);

  return { total, devuelto, cobrado, saldo: total.sub(devuelto).sub(cobrado), estadoCobro, pagos };
}

async function obtenerPedido(prismaOrTx: Prisma.TransactionClient | typeof prisma, idPedido: bigint) {
  const pedido = await pedidosRepository.obtenerPorId(prismaOrTx, idPedido);

  if (!pedido) {
    throw new ErrorNoEncontrado("Pedido no encontrado");
  }

  return pedido;
}

export const pagosService = {
  async listar(idPedido: bigint) {
    const pedido = await obtenerPedido(prisma, idPedido);
    const pagos = await pagosRepository.listarPorPedido(prisma, idPedido);
    const devuelto = await devolucionesRepository.valorDevuelto(prisma, idPedido);

    return resumen(pedido.total, devuelto, pedido.estadoCobro, pagos);
  },

  // Recalcula ESTADO_COBRO con los pagos del pedido (en la transaccion de quien lo llama: un pago,
  // una anulacion, una devolucion o un cambio de lineas que mueve el total). Se compara lo cobrado
  // neto contra el total menos lo devuelto. Sin pagos no toca nada.
  async recalcularEstadoCobro(tx: Prisma.TransactionClient, idPedido: bigint) {
    const pedido = await obtenerPedido(tx, idPedido);
    const pagos = await pagosRepository.listarPorPedido(tx, idPedido);
    const devuelto = await devolucionesRepository.valorDevuelto(tx, idPedido);
    const estado = calcularEstadoCobro(pedido.total.sub(devuelto), sumarVigentes(pagos), pagos.length > 0);

    if (estado && estado !== pedido.estadoCobro) {
      await pedidosRepository.actualizar(tx, idPedido, { estadoCobro: estado });
    }

    return resumen(pedido.total, devuelto, estado ?? pedido.estadoCobro, pagos);
  },

  async registrar(
    idPedido: bigint,
    data: { fecha: Date; monto: number; medioPago: MedioPago; observaciones?: string },
    idUsuario?: bigint
  ) {
    return prisma.$transaction(async (tx) => {
      await pagosRepository.bloquearPedido(tx, idPedido);
      const pedido = await obtenerPedido(tx, idPedido);

      if (pedido.estadoPedido === "CANCELADO") {
        throw new ErrorConflicto("No se registran pagos en un pedido cancelado");
      }

      const monto = new Prisma.Decimal(data.monto);
      const devuelto = await devolucionesRepository.valorDevuelto(tx, idPedido);
      const saldo = pedido.total.sub(devuelto).sub(sumarVigentes(await pagosRepository.listarPorPedido(tx, idPedido)));

      if (monto.greaterThan(saldo)) {
        throw new ErrorConflicto(`El pago supera el saldo del pedido (${saldo.toFixed(2)})`, {
          saldo: saldo.toFixed(2)
        });
      }

      await pagosRepository.crear(tx, {
        idPedido,
        fecha: data.fecha,
        monto,
        medioPago: data.medioPago,
        observaciones: data.observaciones || undefined,
        idUsuario
      });

      return this.recalcularEstadoCobro(tx, idPedido);
    });
  },

  // Un pago no se borra: se anula con motivo (solo administradores, por la ruta).
  async anular(idPedido: bigint, idPago: bigint, motivo: string, idUsuario?: bigint, ahora = new Date()) {
    return prisma.$transaction(async (tx) => {
      await pagosRepository.bloquearPedido(tx, idPedido);
      await obtenerPedido(tx, idPedido);
      const pago = await pagosRepository.obtenerPorId(tx, idPago);

      // Un pago de otro pedido no se alcanza desde este (alcance por registro).
      if (!pago || pago.idPedido !== idPedido) {
        throw new ErrorNoEncontrado("Pago no encontrado");
      }

      if (pago.anulado) {
        throw new ErrorConflicto("El pago ya esta anulado");
      }

      // Un reintegro (monto negativo) es parte de una devolucion, que no se deshace.
      if (pago.monto.isNegative()) {
        throw new ErrorConflicto("Un reintegro no se anula: es parte de una devolucion del pedido");
      }

      await pagosRepository.anular(tx, idPago, { motivo, idUsuario, fecha: ahora });

      return this.recalcularEstadoCobro(tx, idPedido);
    });
  }
};
