import { EstadoSolicitud } from "../../compartido/dominio/enums";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";

import { solicitudesEspecialesRepository } from "./solicitudes-especiales.repository";

export const solicitudesEspecialesService = {
  listar(filtros: { idCliente?: bigint; estadoSolicitud?: EstadoSolicitud; limit: number; offset: number }) {
    return solicitudesEspecialesRepository.listar(filtros);
  },

  async obtenerPorId(idSolicitudEspecial: bigint) {
    const solicitud = await solicitudesEspecialesRepository.obtenerPorId(prisma, idSolicitudEspecial);

    if (!solicitud) {
      throw new ErrorNoEncontrado("Solicitud especial no encontrada");
    }

    return solicitud;
  },

  async validarCliente(idCliente?: bigint) {
    if (!idCliente) {
      return;
    }

    const cliente = await solicitudesEspecialesRepository.obtenerCliente(prisma, idCliente);

    if (!cliente) {
      throw new ErrorNoEncontrado("Cliente no encontrado");
    }
  },

  async crear(data: {
    idCliente?: bigint;
    nombreSolicitante: string;
    telefono?: string;
    email?: string;
    descripcion: string;
    estadoSolicitud?: EstadoSolicitud;
    observaciones?: string;
  }) {
    await this.validarCliente(data.idCliente);
    return solicitudesEspecialesRepository.crear(prisma, data);
  },

  async actualizar(
    idSolicitudEspecial: bigint,
    data: Partial<{
      idCliente?: bigint;
      nombreSolicitante: string;
      telefono?: string;
      email?: string;
      descripcion: string;
      estadoSolicitud: EstadoSolicitud;
      observaciones?: string;
    }>
  ) {
    await this.obtenerPorId(idSolicitudEspecial);
    await this.validarCliente(data.idCliente);
    return solicitudesEspecialesRepository.actualizar(prisma, idSolicitudEspecial, data);
  },

  async cambiarEstado(idSolicitudEspecial: bigint, estadoSolicitud: EstadoSolicitud) {
    await this.obtenerPorId(idSolicitudEspecial);
    return solicitudesEspecialesRepository.actualizar(prisma, idSolicitudEspecial, { estadoSolicitud });
  }
};
