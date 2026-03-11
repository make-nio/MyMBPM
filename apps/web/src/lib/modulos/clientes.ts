import { apiFetch, buildQuery } from "../api";
import { Cliente, ClientePayload } from "../../types/clientes";

type FiltrosClientes = {
  busqueda?: string;
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarClientes(filtros: FiltrosClientes = {}) {
  return apiFetch<{ ok: true; data: Cliente[] }>(
    `/api/clientes${buildQuery({
      busqueda: filtros.busqueda,
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function crearCliente(payload: ClientePayload) {
  return apiFetch<{ ok: true; data: Cliente }>("/api/clientes", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarCliente(idCliente: string, payload: Partial<ClientePayload>) {
  return apiFetch<{ ok: true; data: Cliente }>(`/api/clientes/${idCliente}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function cambiarEstadoCliente(idCliente: string, activo: boolean) {
  return apiFetch<{ ok: true; data: Cliente }>(`/api/clientes/${idCliente}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  }).then((response) => response.data);
}
