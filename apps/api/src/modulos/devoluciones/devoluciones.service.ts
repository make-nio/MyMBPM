import { Prisma } from "@prisma/client";

import { MedioPago } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { prisma } from "../../lib/prisma";
import { configuracionService } from "../configuracion/configuracion.service";
import { pagosRepository } from "../pagos/pagos.repository";
import { pagosService } from "../pagos/pagos.service";
import { pedidosRepository } from "../pedidos/pedidos.repository";
import { ordenarPorItem, stockService } from "../stock/stock.service";

import { devolucionesRepository } from "./devoluciones.repository";

type RegistrarDevolucionInput = {
  lineas: Array<{ idPedidoDetalle: bigint; cantidad: number }>;
  motivo: string;
  devolverStock?: boolean;
  reintegrar?: boolean;
  montoReintegro?: number;
  medioReintegro?: MedioPago;
};

const cero = () => new Prisma.Decimal(0);

function nombrePedido(pedido: { idPedido: bigint; numeroPedido: string | null }) {
  return pedido.numeroPedido ?? pedido.idPedido.toString();
}

export const devolucionesService = {
  async listar(idPedido: bigint) {
    const pedido = await pedidosRepository.obtenerPorId(prisma, idPedido);

    if (!pedido) {
      throw new ErrorNoEncontrado("Pedido no encontrado");
    }

    const devoluciones = await devolucionesRepository.listarPorPedido(prisma, idPedido);

    return {
      devuelto: devoluciones.reduce(
        (suma, devolucion) => devolucion.detalles.reduce((parcial, detalle) => parcial.add(detalle.subtotal), suma),
        cero()
      ),
      devoluciones
    };
  },

  // Devolucion de un pedido entregado (#96): el cliente trae de vuelta todo o una parte. Si vuelve
  // al stock y si se reintegra la plata lo decide la configuracion (o quien la registra, cuando
  // hay que preguntar). Todo en una transaccion con lock del pedido: dos devoluciones a la vez no
  // pueden devolver entre las dos mas de lo entregado.
  async registrar(idPedido: bigint, data: RegistrarDevolucionInput, idUsuario?: bigint) {
    // La configuracion se lee antes de la transaccion (ver configuracion.repository).
    const devuelveStock = await configuracionService.decidirDevolucion("devolucionStock", data.devolverStock);
    const quiereReintegrar = await configuracionService.decidirDevolucion("devolucionReintegro", data.reintegrar);

    await prisma.$transaction(async (tx) => {
      await pagosRepository.bloquearPedido(tx, idPedido);
      const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!pedido) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      if (pedido.estadoPedido !== "ENTREGADO") {
        throw new ErrorConflicto("Solo se registra una devolucion de un pedido entregado");
      }

      const porId = new Map(pedido.detalles.map((detalle) => [detalle.idPedidoDetalle, detalle]));
      const yaDevueltas = await devolucionesRepository.cantidadesDevueltas(tx, idPedido);

      const detalles = data.lineas.map((linea) => {
        const detalle = porId.get(linea.idPedidoDetalle);

        // Una linea de otro pedido no se alcanza desde este.
        if (!detalle) {
          throw new ErrorNoEncontrado("Linea del pedido no encontrada");
        }

        const cantidad = new Prisma.Decimal(linea.cantidad);
        const pendiente = detalle.cantidad.sub(yaDevueltas.get(detalle.idPedidoDetalle) ?? cero());

        if (cantidad.greaterThan(pendiente)) {
          throw new ErrorConflicto(
            `De "${detalle.nombreItemSnapshot}" se pueden devolver hasta ${pendiente.toString()}`,
            { idPedidoDetalle: detalle.idPedidoDetalle.toString(), pendiente: pendiente.toString() }
          );
        }

        return {
          idPedidoDetalle: detalle.idPedidoDetalle,
          idItemCatalogo: detalle.idItemCatalogo,
          cantidad,
          precioUnitario: detalle.precioUnitario,
          subtotal: cantidad.mul(detalle.precioUnitario).toDecimalPlaces(2)
        };
      });

      const valor = detalles.reduce((suma, detalle) => suma.add(detalle.subtotal), cero());
      const reintegro = quiereReintegrar ? await this.calcularReintegro(tx, idPedido, valor, data) : null;
      const pagoReintegro = reintegro
        ? await pagosRepository.crear(tx, {
            idPedido,
            fecha: new Date(),
            // El reintegro es un pago negativo: lo cobrado neto baja solo.
            monto: reintegro.monto.negated(),
            medioPago: reintegro.medioPago,
            observaciones: `Reintegro por devolucion: ${data.motivo}`.slice(0, 500),
            idUsuario
          })
        : null;

      const devolucion = await devolucionesRepository.crear(tx, {
        idPedido,
        motivo: data.motivo,
        devuelveStock,
        idPagoReintegro: pagoReintegro?.idPago,
        idUsuario,
        detalles: detalles.map(({ idItemCatalogo: _item, ...detalle }) => detalle)
      });

      if (devuelveStock) {
        // Una linea por ingreso, en orden de item (locks sin deadlocks). Idempotente por linea.
        for (const detalle of ordenarPorItem(devolucion.detalles, (linea) => linea.pedidoDetalle.idItemCatalogo)) {
          await stockService.registrarIngreso(tx, {
            idItemCatalogo: detalle.pedidoDetalle.idItemCatalogo,
            idUsuario,
            tipoStock: "PRODUCTO",
            tipoMovimiento: "INGRESO_DEVOLUCION",
            cantidad: detalle.cantidad,
            origenMovimiento: "DEVOLUCION",
            idReferenciaOrigen: devolucion.idDevolucion,
            idReferenciaDetalle: detalle.idDevolucionDetalle,
            observaciones: `Devolucion del pedido ${nombrePedido(pedido)}: ${data.motivo}`.slice(0, 2000)
          });
        }
      }

      await pagosService.recalcularEstadoCobro(tx, idPedido);
    });

    return this.listar(idPedido);
  },

  // Cuanto y por que medio se reintegra. Sin monto, lo devuelto; nunca mas de lo cobrado neto.
  // Si no hay nada cobrado no hay que reintegrar (null).
  async calcularReintegro(
    tx: Prisma.TransactionClient,
    idPedido: bigint,
    valor: Prisma.Decimal,
    data: Pick<RegistrarDevolucionInput, "montoReintegro" | "medioReintegro">
  ) {
    const cobrado = (await pagosRepository.listarPorPedido(tx, idPedido))
      .filter((pago) => !pago.anulado)
      .reduce((suma, pago) => suma.add(pago.monto), cero());

    if (cobrado.lessThanOrEqualTo(0)) {
      if (data.montoReintegro !== undefined) {
        throw new ErrorConflicto("No hay nada cobrado para reintegrar");
      }
      return null;
    }

    const monto = data.montoReintegro !== undefined ? new Prisma.Decimal(data.montoReintegro) : Prisma.Decimal.min(valor, cobrado);

    if (monto.greaterThan(cobrado)) {
      throw new ErrorConflicto(`El reintegro supera lo cobrado (${cobrado.toFixed(2)})`, { cobrado: cobrado.toFixed(2) });
    }

    if (!data.medioReintegro) {
      throw new ErrorValidacion("Indica por que medio se reintegra", [
        { path: "medioReintegro", message: "Elegi el medio del reintegro" }
      ]);
    }

    return { monto, medioPago: data.medioReintegro };
  }
};
