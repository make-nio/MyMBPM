import { pedirApi } from "../api";
import { EstadoProduccion } from "../../types/produccion";

export function listarOrdenesProduccion(filtros: { estadoProduccion?: EstadoProduccion; limit?: number; offset?: number } = {}) {
  return pedirApi("get /api/produccion", {
    consulta: {
      estadoProduccion: filtros.estadoProduccion,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function obtenerOrdenProduccion(idOrdenProduccion: string) {
  return pedirApi("get /api/produccion/{id}", { params: { id: idOrdenProduccion } });
}

export function crearOrdenProduccion(payload: { observaciones?: string }) {
  return pedirApi("post /api/produccion", { cuerpo: payload });
}

export function agregarDetalleOrden(
  idOrdenProduccion: string,
  payload: { idItemCatalogoProducto: string; cantidad: number; observaciones?: string }
) {
  return pedirApi("post /api/produccion/{id}/detalles", { params: { id: idOrdenProduccion }, cuerpo: payload });
}

export function actualizarDetalleOrden(
  idOrdenProduccion: string,
  idOrdenProduccionDetalle: string,
  payload: { cantidad?: number; observaciones?: string }
) {
  return pedirApi("patch /api/produccion/{id}/detalles/{detalleId}", {
    params: { id: idOrdenProduccion, detalleId: idOrdenProduccionDetalle },
    cuerpo: payload
  });
}

export function eliminarDetalleOrden(idOrdenProduccion: string, idOrdenProduccionDetalle: string) {
  return pedirApi("delete /api/produccion/{id}/detalles/{detalleId}", {
    params: { id: idOrdenProduccion, detalleId: idOrdenProduccionDetalle }
  });
}

export function cancelarOrdenProduccion(idOrdenProduccion: string) {
  return pedirApi("patch /api/produccion/{id}/estado", {
    params: { id: idOrdenProduccion },
    cuerpo: { estadoProduccion: "CANCELADA" }
  });
}

export function iniciarOrdenProduccion(idOrdenProduccion: string) {
  return pedirApi("post /api/produccion/{id}/iniciar", { params: { id: idOrdenProduccion } });
}

export function finalizarOrdenProduccion(idOrdenProduccion: string) {
  return pedirApi("post /api/produccion/{id}/finalizar", { params: { id: idOrdenProduccion } });
}
