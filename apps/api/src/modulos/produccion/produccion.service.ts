import { Prisma } from "@prisma/client";

import { EstadoProduccion } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { produccionRepository } from "./produccion.repository";

function aDecimal(value: number | string | Prisma.Decimal) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value);
}

export const produccionService = {
  listar(filtros: { estadoProduccion?: EstadoProduccion; limit: number; offset: number }) {
    return produccionRepository.listar(filtros);
  },

  async obtenerPorId(idOrdenProduccion: bigint) {
    const orden = await produccionRepository.obtenerPorId(prisma, idOrdenProduccion);

    if (!orden) {
      throw new ErrorNoEncontrado("Orden de produccion no encontrada");
    }

    return orden;
  },

  crear(data: { observaciones?: string; activo?: boolean }) {
    return produccionRepository.crear(prisma, data);
  },

  async agregarDetalle(
    idOrdenProduccion: bigint,
    data: { idItemCatalogoProducto: bigint; cantidad: number; observaciones?: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const orden = await produccionRepository.obtenerPorId(tx, idOrdenProduccion);

      if (!orden) {
        throw new ErrorNoEncontrado("Orden de produccion no encontrada");
      }

      if (orden.estadoProduccion !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden agregar detalles a ordenes pendientes");
      }

      const item = await produccionRepository.obtenerItemCatalogo(tx, data.idItemCatalogoProducto);

      if (!item) {
        throw new ErrorNoEncontrado("Item de catalogo no encontrado");
      }

      if (item.tipoItem !== "PRODUCTO") {
        throw new ErrorConflicto("Solo se pueden producir items de tipo PRODUCTO");
      }

      await produccionRepository.agregarDetalle(tx, {
        idOrdenProduccion,
        idItemCatalogoProducto: data.idItemCatalogoProducto,
        cantidad: aDecimal(data.cantidad),
        observaciones: data.observaciones
      });

      return produccionRepository.obtenerPorId(tx, idOrdenProduccion);
    });
  },

  async actualizarDetalle(
    idOrdenProduccion: bigint,
    idOrdenProduccionDetalle: bigint,
    data: { cantidad?: number; observaciones?: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const orden = await produccionRepository.obtenerPorId(tx, idOrdenProduccion);

      if (!orden) {
        throw new ErrorNoEncontrado("Orden de produccion no encontrada");
      }

      if (orden.estadoProduccion !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden editar detalles de ordenes pendientes");
      }

      const detalle = await produccionRepository.obtenerDetalle(tx, idOrdenProduccionDetalle);

      if (!detalle || detalle.idOrdenProduccion !== idOrdenProduccion) {
        throw new ErrorNoEncontrado("Detalle de produccion no encontrado");
      }

      await produccionRepository.actualizarDetalle(tx, idOrdenProduccionDetalle, {
        cantidad: data.cantidad ? aDecimal(data.cantidad) : undefined,
        observaciones: data.observaciones
      });

      return produccionRepository.obtenerPorId(tx, idOrdenProduccion);
    });
  },

  async eliminarDetalle(idOrdenProduccion: bigint, idOrdenProduccionDetalle: bigint) {
    return prisma.$transaction(async (tx) => {
      const orden = await produccionRepository.obtenerPorId(tx, idOrdenProduccion);

      if (!orden) {
        throw new ErrorNoEncontrado("Orden de produccion no encontrada");
      }

      if (orden.estadoProduccion !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se pueden eliminar detalles de ordenes pendientes");
      }

      const detalle = await produccionRepository.obtenerDetalle(tx, idOrdenProduccionDetalle);

      if (!detalle || detalle.idOrdenProduccion !== idOrdenProduccion) {
        throw new ErrorNoEncontrado("Detalle de produccion no encontrado");
      }

      await produccionRepository.eliminarDetalle(tx, idOrdenProduccionDetalle);
      return produccionRepository.obtenerPorId(tx, idOrdenProduccion);
    });
  },

  async actualizarEstado(
    idOrdenProduccion: bigint,
    data: { estadoProduccion: EstadoProduccion; observaciones?: string }
  ) {
    const orden = await this.obtenerPorId(idOrdenProduccion);

    if (data.estadoProduccion === "EN_PROCESO" || data.estadoProduccion === "FINALIZADA") {
      throw new ErrorConflicto("Use los endpoints especificos para iniciar o finalizar produccion");
    }

    return produccionRepository.actualizar(prisma, orden.idOrdenProduccion, data);
  },

  async iniciar(idOrdenProduccion: bigint, idUsuario?: bigint) {
    return prisma.$transaction(async (tx) => {
      const orden = await produccionRepository.obtenerPorId(tx, idOrdenProduccion);

      if (!orden) {
        throw new ErrorNoEncontrado("Orden de produccion no encontrada");
      }

      if (orden.estadoProduccion !== "PENDIENTE") {
        throw new ErrorConflicto("Solo se puede iniciar una orden pendiente");
      }

      if (orden.detalles.length === 0) {
        throw new ErrorConflicto("La orden debe tener al menos un detalle");
      }

      const consumos: Array<{
        idOrdenProduccion: bigint;
        idItemCatalogoInsumo: bigint;
        cantidad: Prisma.Decimal;
      }> = [];

      for (const detalle of orden.detalles) {
        const componentes = await produccionRepository.obtenerComponentesActivos(
          tx,
          detalle.idItemCatalogoProducto
        );

        if (componentes.length === 0) {
          throw new ErrorConflicto(
            `El producto ${detalle.itemCatalogoProducto.nombre} no tiene componentes activos para iniciar produccion`
          );
        }

        for (const componente of componentes) {
          const cantidadConsumo = detalle.cantidad.mul(componente.cantidadRequerida);

          await stockService.registrarEgreso(tx, {
            idItemCatalogo: componente.idItemCatalogoHijo,
            idUsuario,
            tipoStock: "INSUMO",
            tipoMovimiento: "EGRESO_PRODUCCION",
            cantidad: cantidadConsumo,
            origenMovimiento: "PRODUCCION",
            idReferenciaOrigen: orden.idOrdenProduccion,
            idReferenciaDetalle: detalle.idOrdenProduccionDetalle,
            observaciones: `Inicio de produccion ${orden.idOrdenProduccion.toString()}`
          });

          consumos.push({
            idOrdenProduccion: orden.idOrdenProduccion,
            idItemCatalogoInsumo: componente.idItemCatalogoHijo,
            cantidad: cantidadConsumo
          });
        }
      }

      if (consumos.length > 0) {
        await produccionRepository.crearConsumos(tx, consumos);
      }

      await produccionRepository.actualizar(tx, orden.idOrdenProduccion, {
        estadoProduccion: "EN_PROCESO",
        fechaInicio: new Date()
      });

      return produccionRepository.obtenerPorId(tx, orden.idOrdenProduccion);
    });
  },

  async finalizar(idOrdenProduccion: bigint, idUsuario?: bigint) {
    return prisma.$transaction(async (tx) => {
      const orden = await produccionRepository.obtenerPorId(tx, idOrdenProduccion);

      if (!orden) {
        throw new ErrorNoEncontrado("Orden de produccion no encontrada");
      }

      if (orden.estadoProduccion !== "EN_PROCESO") {
        throw new ErrorConflicto("Solo se puede finalizar una orden en proceso");
      }

      for (const detalle of orden.detalles) {
        await stockService.registrarIngreso(tx, {
          idItemCatalogo: detalle.idItemCatalogoProducto,
          idUsuario,
          tipoStock: "PRODUCTO",
          tipoMovimiento: "INGRESO_PRODUCCION",
          cantidad: detalle.cantidad,
          origenMovimiento: "PRODUCCION",
          idReferenciaOrigen: orden.idOrdenProduccion,
          idReferenciaDetalle: detalle.idOrdenProduccionDetalle,
          observaciones: `Finalizacion de produccion ${orden.idOrdenProduccion.toString()}`
        });
      }

      await produccionRepository.actualizar(tx, orden.idOrdenProduccion, {
        estadoProduccion: "FINALIZADA",
        fechaFin: new Date()
      });

      return produccionRepository.obtenerPorId(tx, orden.idOrdenProduccion);
    });
  }
};
