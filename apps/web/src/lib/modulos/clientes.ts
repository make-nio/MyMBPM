import { pedirApi } from "../api";
import { ClientePayload } from "../../types/clientes";

type FiltrosClientes = {
  busqueda?: string;
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarClientes(filtros: FiltrosClientes = {}) {
  return pedirApi("get /api/clientes", {
    consulta: {
      busqueda: filtros.busqueda,
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function obtenerCliente(idCliente: string) {
  return pedirApi("get /api/clientes/{id}", { params: { id: idCliente } });
}

export function crearCliente(payload: ClientePayload) {
  return pedirApi("post /api/clientes", { cuerpo: payload });
}

export function actualizarCliente(idCliente: string, payload: Partial<ClientePayload>) {
  return pedirApi("patch /api/clientes/{id}", { params: { id: idCliente }, cuerpo: payload });
}

export function cambiarEstadoCliente(idCliente: string, activo: boolean) {
  return pedirApi("patch /api/clientes/{id}/estado", { params: { id: idCliente }, cuerpo: { activo } });
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

// Total comprado y cantidad de pedidos (criterio "vendido"), para la ficha del cliente.
export function obtenerResumenCliente(idCliente: string) {
  return pedirApi("get /api/clientes/{id}/resumen", { params: { id: idCliente } });
}
