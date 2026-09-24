import { EstadoSolicitud } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";

import { pedidosService } from "../pedidos/pedidos.service";

import { ESTADOS_CONVERTIBLES, solicitudesEspecialesRepository } from "./solicitudes-especiales.repository";

function recortar(texto: string, maximo: number) {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 3)}...`;
}

// "Convertida a pedido" solo se alcanza con la conversion (que crea y vincula el pedido), y una
// solicitud ya convertida no cambia mas de estado.
function validarEstadoManual(estado?: string) {
  if (estado === "CONVERTIDA_A_PEDIDO") {
    throw new ErrorConflicto("Para marcarla como convertida usa \"Convertir en pedido\"");
  }
}

function validarCambioDeEstado(solicitud: { idPedido: bigint | null }, estadoNuevo: string) {
  if (solicitud.idPedido) {
    throw new ErrorConflicto("La solicitud ya se convirtio en pedido: su estado no se cambia");
  }

  validarEstadoManual(estadoNuevo);
}

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
    validarEstadoManual(data.estadoSolicitud);
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
    const solicitud = await this.obtenerPorId(idSolicitudEspecial);

    if (data.estadoSolicitud && data.estadoSolicitud !== solicitud.estadoSolicitud) {
      validarCambioDeEstado(solicitud, data.estadoSolicitud);
    }

    await this.validarCliente(data.idCliente);
    return solicitudesEspecialesRepository.actualizar(prisma, idSolicitudEspecial, data);
  },

  async cambiarEstado(idSolicitudEspecial: bigint, estadoSolicitud: EstadoSolicitud) {
    const solicitud = await this.obtenerPorId(idSolicitudEspecial);
    validarCambioDeEstado(solicitud, estadoSolicitud);
    return solicitudesEspecialesRepository.actualizar(prisma, idSolicitudEspecial, { estadoSolicitud });
  },

  // Crea un pedido pendiente para el cliente de la solicitud y la deja "Convertida a pedido",
  // vinculada. Los items y precios se cargan despues en el pedido.
  async convertirEnPedido(idSolicitudEspecial: bigint) {
    const solicitud = await this.obtenerPorId(idSolicitudEspecial);

    if (solicitud.idPedido) {
      throw new ErrorConflicto(`La solicitud ya se convirtio en el pedido ${solicitud.pedido?.numeroPedido ?? solicitud.idPedido}`);
    }

    if (!ESTADOS_CONVERTIBLES.includes(solicitud.estadoSolicitud)) {
      throw new ErrorConflicto("Solo se convierten solicitudes pendientes, en revision o aprobadas");
    }

    if (!solicitud.idCliente) {
      throw new ErrorConflicto("Asocia un cliente a la solicitud antes de convertirla en pedido");
    }

    const idCliente = solicitud.idCliente;

    return prisma.$transaction(async (tx) => {
      const pedido = await pedidosService.crearEnTransaccion(tx, {
        idCliente,
        origenPedido: "MANUAL",
        observacionesCliente: recortar(solicitud.descripcion, 2000),
        observacionesInternas: `Desde la solicitud especial #${solicitud.idSolicitudEspecial.toString()} (${solicitud.nombreSolicitante})`
      });

      if (!(await solicitudesEspecialesRepository.marcarConvertida(tx, idSolicitudEspecial, pedido.idPedido))) {
        throw new ErrorConflicto("La solicitud cambio mientras se convertia: volve a intentarlo");
      }

      return { idPedido: pedido.idPedido, numeroPedido: pedido.numeroPedido };
    });
  }
};
