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
// items despues de descontado el stock). ENTREGADO y CANCELADO son finales.
const TRANSICIONES_ESTADO_PEDIDO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  PENDIENTE: ["CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "LISTO", "ENTREGADO", "CANCELADO"],
  EN_PREPARACION: ["LISTO", "ENTREGADO", "CANCELADO"],
  LISTO: ["EN_PREPARACION", "ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: []
};

const ESTADOS_CERRADOS: readonly EstadoPedido[] = ["ENTREGADO", "CANCELADO"];

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

  crear(data: DatosAltaPedido) {
    return prisma.$transaction((tx) => this.crearEnTransaccion(tx, data));
  },

  // Alta con su numero de pedido, dentro de una transaccion ajena (por ejemplo, al convertir una
  // solicitud especial: el pedido y la solicitud se guardan juntos o no se guarda nada).
  async crearEnTransaccion(tx: Prisma.TransactionClient, data: DatosAltaPedido) {
    const cliente = await pedidosRepository.obtenerCliente(tx, data.idCliente);

    if (!cliente) {
      throw new ErrorNoEncontrado("Cliente no encontrado");
    }

    const pedido = await pedidosRepository.crear(tx, data);

    return pedidosRepository.actualizar(tx, pedido.idPedido, {
      numeroPedido: construirNumeroPedido(pedido.idPedido)
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
  async repetir(idPedido: bigint) {
    return prisma.$transaction(async (tx) => {
      const original = await pedidosRepository.obtenerPorId(tx, idPedido);

      if (!original) {
        throw new ErrorNoEncontrado("Pedido no encontrado");
      }

      const lineas = (await lineasARepetir(tx, original)).filter((linea) => linea.item !== null);

      if (lineas.length === 0) {
        throw new ErrorConflicto("Ninguna linea del pedido se puede repetir: sus items estan inactivos o sin precio");
      }

      const nuevo = await pedidosService.crearEnTransaccion(tx, {
        idCliente: original.idCliente,
        origenPedido: original.origenPedido as OrigenPedido,
        observacionesInternas: `Repetido de ${original.numeroPedido ?? original.idPedido.toString()}`
      });

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

  async actualizarEstado(
    idPedido: bigint,
    data: {
      estadoPedido?: EstadoPedido;
      estadoCobro?: EstadoCobro;
      observacionesInternas?: string;
      fechaEntrega?: Date | null;
    }
  ) {
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

      return pedidosRepository.obtenerPorId(tx, pedido.idPedido);
    });
  }
};
