import { Prisma } from "@prisma/client";

import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";

import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";

import { clientesRepository } from "./clientes.repository";

export const CAMPOS_AUDITADOS_CLIENTE = [
  "nombre",
  "apellido",
  "documento",
  "telefono",
  "email",
  "instagram",
  "domicilio",
  "localidad",
  "provincia",
  "observaciones",
  "activo"
] as const;

function auditoriaCliente(idCliente: bigint, idUsuario?: bigint) {
  return { entidad: "CLIENTE" as const, idEntidad: idCliente, idUsuario, campos: CAMPOS_AUDITADOS_CLIENTE };
}

export const clientesService = {
  listar(filtros: { busqueda?: string; activo?: boolean; limit: number; offset: number }) {
    return clientesRepository.listar(filtros);
  },

  async obtenerPorId(idCliente: bigint) {
    const cliente = await clientesRepository.obtenerPorId(idCliente);

    if (!cliente) {
      throw new ErrorNoEncontrado("Cliente no encontrado");
    }

    return cliente;
  },

  async obtenerResumen(idCliente: bigint) {
    await clientesService.obtenerPorId(idCliente);
    const resumen = await clientesRepository.resumenCompras(idCliente);

    return {
      totalComprado: resumen._sum.total ?? new Prisma.Decimal(0),
      pedidosComprados: resumen._count._all,
      fechaUltimaCompra: resumen._max.fechaConfirmacion
    };
  },

  crear(data: {
    nombre: string;
    apellido?: string;
    documento?: string;
    telefono?: string;
    email?: string;
    instagram?: string;
    domicilio?: string;
    localidad?: string;
    provincia?: string;
    observaciones?: string;
    activo?: boolean;
  }, idUsuario?: bigint) {
    return prisma.$transaction(async (tx) => {
      const cliente = await clientesRepository.crear(data, tx);
      await auditoriaService.registrarAlta(tx, auditoriaCliente(cliente.idCliente, idUsuario), cliente);
      return cliente;
    });
  },

  async actualizar(
    idCliente: bigint,
    data: Partial<{
      nombre: string;
      apellido?: string;
      documento?: string;
      telefono?: string;
      email?: string;
      instagram?: string;
      domicilio?: string;
      localidad?: string;
      provincia?: string;
      observaciones?: string;
      activo: boolean;
    }>,
    idUsuario?: bigint
  ) {
    return this.actualizarAuditado(idCliente, data, idUsuario);
  },

  async cambiarEstado(idCliente: bigint, activo: boolean, idUsuario?: bigint) {
    return this.actualizarAuditado(idCliente, { activo }, idUsuario);
  },

  // El cambio y su registro en el historial van en la misma transaccion.
  async actualizarAuditado(
    idCliente: bigint,
    data: Parameters<typeof clientesRepository.actualizar>[1],
    idUsuario?: bigint
  ) {
    return prisma.$transaction(async (tx) => {
      const antes = await clientesRepository.obtenerPorId(idCliente, tx);

      if (!antes) {
        throw new ErrorNoEncontrado("Cliente no encontrado");
      }

      const cliente = await clientesRepository.actualizar(idCliente, data, tx);
      await auditoriaService.registrarModificacion(tx, auditoriaCliente(idCliente, idUsuario), antes, cliente);
      return cliente;
    });
  }
};
