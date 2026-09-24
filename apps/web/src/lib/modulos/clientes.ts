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

export function nombreCliente(cliente: { nombre: string; apellido?: string | null }) {
  return `${cliente.nombre} ${cliente.apellido ?? ""}`.trim();
}

// Opciones para elegir un cliente activo en un formulario (busqueda en la API).
export function buscarOpcionesClientes(texto: string, limit: number) {
  return listarClientes({ busqueda: texto || undefined, activo: true, limit }).then((clientes) =>
    clientes.map((cliente) => ({ value: cliente.idCliente, label: nombreCliente(cliente) }))
  );
}
