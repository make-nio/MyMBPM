import { pedirApi } from "../api";
import { EstadoSolicitud, SolicitudEspecialPayload } from "../../types/solicitudes-especiales";

type FiltrosSolicitudes = {
  idCliente?: string;
  estadoSolicitud?: EstadoSolicitud;
  limit?: number;
  offset?: number;
};

export function listarSolicitudesEspeciales(filtros: FiltrosSolicitudes = {}) {
  return pedirApi("get /api/solicitudes-especiales", {
    consulta: {
      idCliente: filtros.idCliente,
      estadoSolicitud: filtros.estadoSolicitud,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function crearSolicitudEspecial(payload: SolicitudEspecialPayload) {
  return pedirApi("post /api/solicitudes-especiales", { cuerpo: payload });
}

export function actualizarSolicitudEspecial(
  idSolicitudEspecial: string,
  payload: Partial<SolicitudEspecialPayload>
) {
  return pedirApi("patch /api/solicitudes-especiales/{id}", { params: { id: idSolicitudEspecial }, cuerpo: payload });
}

export function cambiarEstadoSolicitudEspecial(
  idSolicitudEspecial: string,
  estadoSolicitud: EstadoSolicitud
) {
  return pedirApi("patch /api/solicitudes-especiales/{id}/estado", {
    params: { id: idSolicitudEspecial },
    cuerpo: { estadoSolicitud }
  });
}

// Crea un pedido pendiente para el cliente de la solicitud y la deja convertida y vinculada.
export function convertirSolicitudEnPedido(idSolicitudEspecial: string) {
  return pedirApi("post /api/solicitudes-especiales/{id}/convertir", { params: { id: idSolicitudEspecial } });
}
