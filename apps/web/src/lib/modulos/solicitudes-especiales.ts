import { apiFetch, buildQuery } from "../api";
import {
  EstadoSolicitud,
  SolicitudEspecial,
  SolicitudEspecialPayload
} from "../../types/solicitudes-especiales";

type FiltrosSolicitudes = {
  idCliente?: string;
  estadoSolicitud?: EstadoSolicitud;
  limit?: number;
  offset?: number;
};

export function listarSolicitudesEspeciales(filtros: FiltrosSolicitudes = {}) {
  return apiFetch<{ ok: true; data: SolicitudEspecial[] }>(
    `/api/solicitudes-especiales${buildQuery({
      idCliente: filtros.idCliente,
      estadoSolicitud: filtros.estadoSolicitud,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function crearSolicitudEspecial(payload: SolicitudEspecialPayload) {
  return apiFetch<{ ok: true; data: SolicitudEspecial }>("/api/solicitudes-especiales", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarSolicitudEspecial(
  idSolicitudEspecial: string,
  payload: Partial<SolicitudEspecialPayload>
) {
  return apiFetch<{ ok: true; data: SolicitudEspecial }>(
    `/api/solicitudes-especiales/${idSolicitudEspecial}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  ).then((response) => response.data);
}

export function cambiarEstadoSolicitudEspecial(
  idSolicitudEspecial: string,
  estadoSolicitud: EstadoSolicitud
) {
  return apiFetch<{ ok: true; data: SolicitudEspecial }>(
    `/api/solicitudes-especiales/${idSolicitudEspecial}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ estadoSolicitud })
    }
  ).then((response) => response.data);
}
