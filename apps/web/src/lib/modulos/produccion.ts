import { apiFetch, buildQuery } from "../api";
import { EstadoProduccion, OrdenProduccion } from "../../types/produccion";

type RespuestaOrden = { ok: true; data: OrdenProduccion };

export function listarOrdenesProduccion(filtros: { estadoProduccion?: EstadoProduccion; limit?: number; offset?: number } = {}) {
  return apiFetch<{ ok: true; data: OrdenProduccion[] }>(
    `/api/produccion${buildQuery({
      estadoProduccion: filtros.estadoProduccion,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function obtenerOrdenProduccion(idOrdenProduccion: string) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}`).then((response) => response.data);
}

export function crearOrdenProduccion(payload: { observaciones?: string }) {
  return apiFetch<RespuestaOrden>("/api/produccion", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function agregarDetalleOrden(
  idOrdenProduccion: string,
  payload: { idItemCatalogoProducto: string; cantidad: number; observaciones?: string }
) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/detalles`, {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarDetalleOrden(
  idOrdenProduccion: string,
  idOrdenProduccionDetalle: string,
  payload: { cantidad?: number; observaciones?: string }
) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/detalles/${idOrdenProduccionDetalle}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function eliminarDetalleOrden(idOrdenProduccion: string, idOrdenProduccionDetalle: string) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/detalles/${idOrdenProduccionDetalle}`, {
    method: "DELETE"
  }).then((response) => response.data);
}

export function cancelarOrdenProduccion(idOrdenProduccion: string) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estadoProduccion: "CANCELADA" })
  }).then((response) => response.data);
}

export function iniciarOrdenProduccion(idOrdenProduccion: string) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/iniciar`, { method: "POST" }).then(
    (response) => response.data
  );
}

export function finalizarOrdenProduccion(idOrdenProduccion: string) {
  return apiFetch<RespuestaOrden>(`/api/produccion/${idOrdenProduccion}/finalizar`, { method: "POST" }).then(
    (response) => response.data
  );
}
