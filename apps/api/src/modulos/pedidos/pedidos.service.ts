import { Prisma } from "@prisma/client";

import {
  EstadoCobro,
  EstadoPedido,
  ESTADOS_ENTREGADOS,
  ESTADOS_PEDIDO,
  OrigenPedido
} from "../../compartido/dominio/enums";
import { inicioDelDiaArgentina, OFFSET_ARGENTINA_MS } from "../../compartido/dominio/fecha-argentina";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { LIMITES } from "../../compartido/validaciones/esquemas-comunes";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { prisma } from "../../lib/prisma";
import { configuracionService } from "../configuracion/configuracion.service";
import { pagosRepository } from "../pagos/pagos.repository";
import { pagosService } from "../pagos/pagos.service";
import { ordenarPorItem, stockService } from "../stock/stock.service";

import { pedidosRepository } from "./pedidos.repository";

function aDecimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value ?? 0);
}

// Transiciones que admite PATCH /:id/estado. CONFIRMADO solo se alcanza con confirmar(), que es
// la operacion que descuenta stock: por eso un pedido PENDIENTE no puede pasar a preparacion o
// entrega sin confirmarse, y uno confirmado no puede volver a PENDIENTE (se podrian editar sus
// items despues de descontado el stock). ENTREGADO y CANCELADO son finales a mano; un pedido
// entregado solo pasa a DEVUELTO_PARCIAL o DEVUELTO registrando una devolucion (#96).
const TRANSICIONES_ESTADO_PEDIDO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  PENDIENTE: ["CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"],
  EN_PREPARACION: ["LISTO", "ENTREGADO", "CANCELADO"],
  LISTO: ["EN_PREPARACION", "ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
  DEVUELTO_PARCIAL: [],
  DEVUELTO: []
};

const ESTADOS_CERRADOS: readonly EstadoPedido[] = [...ESTADOS_ENTREGADOS, "CANCELADO"];

// Estados en los que el pedido ya desconto su stock (al confirmarse) y todavia se puede cancelar.
const ESTADOS_CON_STOCK_DESCONTADO: readonly EstadoPedido[] = ["CONFIRMADO", "EN_PREPARACION", "LISTO"];

// "09/10/2026" para un dia guardado a las 00:00 de Argentina.
function diaArgentinaTexto(fecha: Date) {
  const [anio, mes, dia] = new Date(fecha.getTime() - OFFSET_ARGENTINA_MS).toISOString().slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// Fecha real de entrega (#99): la que indica quien lo marca (lo marca dias despues) o, si no
// indica ninguna, hoy en Argentina. No puede ser futura ni anterior al dia de la confirmacion.
function fechaEntregaRealValida(indicada: Date | undefined, fechaConfirmacion: Date | null, ahora: Date) {
  const hoy = inicioDelDiaArgentina(ahora);
  const fecha = indicada ?? hoy;

  if (fecha.getTime() > hoy.getTime()) {
    throw new ErrorValidacion("La fecha de entrega no puede ser futura", [
      { path: "fechaEntregaReal", message: "Elegi hoy o un dia anterior" }
    ]);
  }

  if (fechaConfirmacion && fecha.getTime() < inicioDelDiaArgentina(fechaConfirmacion).getTime()) {
    throw new ErrorValidacion("La fecha de entrega no puede ser anterior a la confirmacion del pedido", [
      { path: "fechaEntregaReal", message: `Elegi el ${diaArgentinaTexto(inicioDelDiaArgentina(fechaConfirmacion))} o despues` }
    ]);
  }

  return fecha;
}

function construirNumeroPedido(idPedido: bigint) {
  return `PED-${idPedido.toString().padStart(6, "0")}`;
}

type DatosAltaPedido = {
  idCliente: bigint;
  origenPedido: OrigenPedido;
  estadoCobro?: EstadoCobro;
  observacionesCliente?: string;
  observacionesInternas?: string;
  fechaEntrega?: Date | null;
  activo?: boolean;
};

type PedidoConDetalles = NonNullable<Awaited<ReturnType<typeof pedidosRepository.obtenerPorId>>>;
type ItemCatalogo = NonNullable<Awaited<ReturnType<typeof pedidosRepository.obtenerItemCatalogo>>>;

// Una linea con los valores de hoy del item: precio de venta y costo (snapshot). Es lo mismo para
// "Agregar item" y para repetir un pedido.
function lineaDesdeItem(idPedido: bigint, item: ItemCatalogo, cantidadPedida: number | Prisma.Decimal) {
  const cantidad = aDecimal(cantidadPedida);
  const precioUnitario = aDecimal(item.precio);

  return {
    idPedido,
    idItemCatalogo: item.idItemCatalogo,
    nombreItemSnapshot: item.nombre,
    cantidad,
    precioUnitario,
    costoUnitario: aDecimal(item.costo),
    subtotal: precioUnitario.mul(cantidad)
  };
}

// Por que una linea no se puede repetir hoy (null si se puede).
function motivoNoRepetible(item: ItemCatalogo | undefined) {
  if (!item) {
    return "El item ya no existe";
  }

  if (!item.activo) {
    return "El item esta inactivo";
  }

  if (item.precio === null) {
    return "El item no tiene precio";
  }

  return null;
}

async function lineasARepetir(prismaOrTx: Prisma.TransactionClient | typeof prisma, original: PedidoConDetalles) {
  const items = await pedidosRepository.obtenerItemsCatalogo(prismaOrTx, [
    ...new Set(original.detalles.map((detalle) => detalle.idItemCatalogo))
  ]);
  const porId = new Map(items.map((item) => [item.idItemCatalogo.toString(), item]));

  return original.detalles.map((detalle) => {
    const item = porId.get(detalle.idItemCatalogo.toString());
    const motivo = motivoNoRepetible(item);
    const precioHoy = item && !motivo ? aDecimal(item.precio) : null;

    return {
      idItemCatalogo: detalle.idItemCatalogo,
      nombre: item?.nombre ?? detalle.nombreItemSnapshot,
      cantidad: detalle.cantidad,
      precioAnterior: detalle.precioUnitario,
      precioHoy,
      subtotal: precioHoy ? precioHoy.mul(detalle.cantidad) : null,
      disponible: motivo === null,
      motivo,
      item: motivo ? null : item ?? null
    };
  });
}

// Sin permiso para ver costos, el pedido sale sin el costo de cada linea ni el del item: el
// margen se calcula con esos datos. Precio y total son de venta y se ven igual.
export function ocultarCostos(pedido: PedidoConDetalles) {
  return {
    ...pedido,
    detalles: (pedido.detalles ?? []).map(({ costoUnitario: _costo, itemCatalogo, ...detalle }) => {
      if (!itemCatalogo) {
        return detalle;
      }

      const { costo: _costoItem, ...itemSinCosto } = itemCatalogo;
      return { ...detalle, itemCatalogo: itemSinCosto };
    })
  };
}

export const pedidosService = {
  presentar<T extends PedidoConDetalles | null>(pedido: T, verCostos: boolean) {
    return pedido && !verCostos ? ocultarCostos(pedido) : pedido;
  },

  listar(filtros: {
    idCliente?: bigint;
    estadoPedido?: EstadoPedido;
    estadoCobro?: EstadoCobro;
    desde?: Date;
    hasta?: Date;
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

  crear(data: DatosAltaPedido, idUsuario?: bigint) {
    return prisma.$transaction((tx) => this.crearEnTransaccion(tx, data, idUsuario));
  },

  // Alta con su numero de pedido, dentro de una transaccion ajena (por ejemplo, al convertir una
  // solicitud especial: el pedido y la solicitud se guardan juntos o no se guarda nada). Guarda
  // quien lo cargo y el primer evento del historial (sin estado anterior, a PENDIENTE). Lo usan
  // el alta, "Repetir" y "Convertir solicitud en pedido".
  async crearEnTransaccion(tx: Prisma.TransactionClient, data: DatosAltaPedido, idUsuario?: bigint) {
    const cliente = await pedidosRepository.obtenerCliente(tx, data.idCliente);

    if (!cliente) {
      throw new ErrorNoEncontrado("Cliente no encontrado");
    }

    const pedido = await pedidosRepository.crear(tx, { ...data, idUsuarioAlta: idUsuario });

    await pedidosRepository.registrarCambioEstado(tx, {
      idPedido: pedido.idPedido,
      estadoAnterior: null,
      estadoNuevo: "PENDIENTE",
      idUsuario,
      origen: "PANTALLA"
    });

    return pedidosRepository.actualizar(tx, pedido.idPedido, {
      numeroPedido: construirNumeroPedido(pedido.idPedido)
    });
  },

  // Linea de tiempo del pedido (#99): cada cambio de estado con quien lo hizo.
  async listarHistorial(idPedido: bigint) {
    await this.obtenerPorId(idPedido);
    return pedidosRepository.listarHistorial(prisma, idPedido);
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

      if (pedido.detalles.length >= LIMITES.lineasPorPedido) {
        throw new ErrorConflicto(
          `Un pedido tiene como mucho ${LIMITES.lineasPorPedido} lineas: suma la cantidad en una linea existente o arma otro pedido`
        );
      }

      const item = await pedidosRepository.obtenerItemCatalogo(tx, data.idItemCatalogo);

      if (!item) {
        throw new ErrorNoEncontrado("Item de catalogo no encontrado");
      }

      await pedidosRepository.agregarDetalle(tx, lineaDesdeItem(idPedido, item, data.cantidad));

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

  // Vista previa de "Repetir": las mismas lineas con el precio de hoy. No crea nada. Las lineas de
  // items inactivos, borrados o sin precio se marcan y no se van a repetir.
  async prepararRepeticion(idPedido: bigint) {
    const original = await pedidosService.obtenerPorId(idPedido);
    const lineas = (await lineasARepetir(prisma, original)).map(({ item: _item, ...linea }) => linea);

    return {
      idPedidoOriginal: original.idPedido,
      numeroPedido: original.numeroPedido,
      idCliente: original.idCliente,
      cliente: { nombre: original.cliente.nombre, apellido: original.cliente.apellido },
      origenPedido: original.origenPedido,
      lineas,
      total: lineas.reduce((total, linea) => total.add(linea.subtotal ?? 0), new Prisma.Decimal(0))
    };
  },

  // Crea el pedido repetido en una sola transaccion: pendiente, mismo cliente y origen, y las
  // lineas que se pueden repetir con el precio y el costo de hoy. No toca stock (eso es al
  // confirmarlo, como cualquier pedido).
  async repetir(idPedido: bigint, idUsuario?: bigint) {
    return prisma.$transaction(async (tx) => {
      const original = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!original) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      const lineas = (await lineasARepetir(tx, original)).filter((linea) => linea.item !== null);

      if (lineas.length === 0) {
        throw new ErrorConflicto("Ninguna linea del pedido se puede repetir: sus items estan inactivos o sin precio");
      }

      const nuevo = await pedidosService.crearEnTransaccion(
        tx,
        {
          idCliente: original.idCliente,
          origenPedido: original.origenPedido as OrigenPedido,
          observacionesInternas: `Repetido de ${original.numeroPedido ?? original.idPedido.toString()}`
        },
        idUsuario
      );

      for (const linea of lineas) {
        await pedidosRepository.agregarDetalle(tx, lineaDesdeItem(nuevo.idPedido, linea.item as ItemCatalogo, linea.cantidad));
      }

      await pedidosService.recalcularTotales(tx, nuevo.idPedido);
      return pedidosRepository.obtenerPorId(tx, nuevo.idPedido);
    });
  },

  async recalcularTotales(tx: Prisma.TransactionClient, idPedido: bigint) {
    const pedido = await pedidosRepository.obtenerPorId(tx, idPedido);

    if (!pedido) {
      throw new ErrorNoEncontrado("Pedido no encontrado");
    }

    const subtotal = pedido.detalles.reduce(
      (acumulado, detalle) => acumulado.add(detalle.subtotal),
      new Prisma.Decimal(0)
    );

    await pedidosRepository.actualizar(tx, idPedido, {
      subtotal,
      total: subtotal
    });

    // Si el pedido ya tiene pagos, el total nuevo puede cambiar su estado de cobro.
    await pagosService.recalcularEstadoCobro(tx, idPedido);
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

      await this.recalcularTotales(tx, idPedido);
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
      await this.recalcularTotales(tx, idPedido);

      return pedidosRepository.obtenerPorId(tx, idPedido);
    });
  },

  // Cambio de estado (y de cobro, observaciones o fecha prometida). Todo en una transaccion: si
  // el evento del historial (#99) no se puede escribir, el pedido no cambia. Un evento por cada
  // cambio real de estado; editar solo la fecha prometida o las observaciones no escribe ninguno.
  async actualizarEstado(
    idPedido: bigint,
    cambios: {
      estadoPedido?: EstadoPedido;
      estadoCobro?: EstadoCobro;
      observacionesInternas?: string;
      fechaEntrega?: Date | null;
      devolverStock?: boolean;
      motivoCancelacion?: string;
      fechaEntregaReal?: Date;
    },
    idUsuario?: bigint,
    ahora = new Date()
  ) {
    const { devolverStock, motivoCancelacion, fechaEntregaReal, ...data } = cambios;
    const pedido = await this.obtenerPorId(idPedido);

    // La fecha prometida sirve mientras el pedido esta abierto: entregado o cancelado ya no se
    // promete nada y la fecha queda como estaba.
    if (data.fechaEntrega !== undefined && ESTADOS_CERRADOS.includes(pedido.estadoPedido as EstadoPedido)) {
      throw new ErrorConflicto("No se puede cambiar la fecha de entrega de un pedido entregado o cancelado");
    }

    if (data.estadoPedido === "CONFIRMADO") {
      throw new ErrorConflicto("Use el endpoint especifico para confirmar pedidos");
    }

    if (
      data.estadoPedido &&
      !ESTADOS_PEDIDO.includes(data.estadoPedido as (typeof ESTADOS_PEDIDO)[number])
    ) {
      throw new ErrorConflicto("Estado de pedido invalido");
    }

    const estadoActual = pedido.estadoPedido as EstadoPedido;

    if (
      data.estadoPedido &&
      data.estadoPedido !== estadoActual &&
      !TRANSICIONES_ESTADO_PEDIDO[estadoActual]?.includes(data.estadoPedido)
    ) {
      throw new ErrorConflicto(
        `No se puede pasar un pedido de ${estadoActual} a ${data.estadoPedido}`,
        { estadoActual, permitidos: TRANSICIONES_ESTADO_PEDIDO[estadoActual] ?? [] }
      );
    }

    const estadoNuevo = data.estadoPedido !== undefined && data.estadoPedido !== estadoActual ? data.estadoPedido : null;
    const extra: { motivoCancelacion?: string; fechaEntregaReal?: Date } = {};
    let observacion: string | undefined;

    // Cancelar pide el motivo, tambien a un pedido pendiente. Queda en el pedido y en el evento.
    if (estadoNuevo === "CANCELADO") {
      const motivo = motivoCancelacion?.trim();

      if (!motivo) {
        throw new ErrorValidacion("Indica por que se cancela el pedido", [
          { path: "motivoCancelacion", message: "Escribi el motivo de la cancelacion" }
        ]);
      }

      extra.motivoCancelacion = motivo;
      observacion = motivo;
    }

    if (estadoNuevo === "ENTREGADO") {
      extra.fechaEntregaReal = fechaEntregaRealValida(fechaEntregaReal, pedido.fechaConfirmacion, ahora);
      observacion = `Entregado el ${diaArgentinaTexto(extra.fechaEntregaReal)}`;
    }

    // Cancelar un pedido que ya desconto stock: se devuelve o no segun la configuracion (o lo que
    // elija quien cancela), en la misma transaccion que el cambio de estado. La configuracion se
    // lee antes: sin la tabla (preview sin migrar) la consulta abortaria la transaccion.
    const devolver =
      estadoNuevo === "CANCELADO" && ESTADOS_CON_STOCK_DESCONTADO.includes(estadoActual)
        ? await configuracionService.decidirDevolucion("cancelarPedido", devolverStock)
        : false;

    return prisma.$transaction(async (tx) => {
      if (estadoNuevo) {
        // Con el pedido bloqueado, el estado tiene que seguir siendo el que se valido: dos cambios
        // a la vez no dejan dos eventos desde el mismo estado.
        await pagosRepository.bloquearPedido(tx, pedido.idPedido);
        const vigente = await pedidosRepository.obtenerPorId(tx, pedido.idPedido);

        if (vigente?.estadoPedido !== estadoActual) {
          throw new ErrorConflicto("El pedido cambio mientras se guardaba: volve a abrirlo y proba de nuevo");
        }
      }

      if (devolver) {
        await stockService.revertirMovimientos(tx, {
          origenMovimiento: "PEDIDO",
          idReferenciaOrigen: pedido.idPedido,
          tipoMovimiento: "EGRESO_PEDIDO",
          idUsuario,
          observaciones: `Cancelacion del pedido ${pedido.numeroPedido ?? pedido.idPedido.toString()}`
        });
      }

      const actualizado = await pedidosRepository.actualizar(tx, pedido.idPedido, { ...data, ...extra });

      if (estadoNuevo) {
        await pedidosRepository.registrarCambioEstado(tx, {
          idPedido: pedido.idPedido,
          estadoAnterior: estadoActual,
          estadoNuevo,
          idUsuario,
          origen: "PANTALLA",
          observacion
        });
      }

      return actualizado;
    });
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

      for (const detalle of ordenarPorItem(pedido.detalles, (detalle) => detalle.idItemCatalogo)) {
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
      await pedidosRepository.registrarCambioEstado(tx, {
        idPedido: pedido.idPedido,
        estadoAnterior: "PENDIENTE",
        estadoNuevo: "CONFIRMADO",
        idUsuario,
        origen: "PANTALLA"
      });

      return pedidosRepository.obtenerPorId(tx, pedido.idPedido);
    });
  }
};
