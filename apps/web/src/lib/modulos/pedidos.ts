import { apiFetch, buildQuery } from "../api";
import {
  EstadoCobro,
  EstadoPedido,
  Pedido,
  PedidoAltaPayload,
  PedidoEstadoPayload,
  RepeticionPedido
} from "../../types/pedidos";

type FiltrosPedidos = {
  idCliente?: string;
  estadoPedido?: EstadoPedido;
  estadoCobro?: EstadoCobro;
  // Fecha de alta, AAAA-MM-DD, los dos dias incluidos.
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
};

type RespuestaPedido = { ok: true; data: Pedido };

export function listarPedidos(filtros: FiltrosPedidos = {}) {
  return apiFetch<{ ok: true; data: Pedido[] }>(
    `/api/pedidos${buildQuery({
      idCliente: filtros.idCliente,
      estadoPedido: filtros.estadoPedido,
      estadoCobro: filtros.estadoCobro,
      desde: filtros.desde,
      hasta: filtros.hasta,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function obtenerPedido(idPedido: string) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}`).then((response) => response.data);
}

export function crearPedido(payload: PedidoAltaPayload) {
  return apiFetch<RespuestaPedido>("/api/pedidos", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function agregarDetallePedido(idPedido: string, payload: { idItemCatalogo: string; cantidad: number }) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/detalles`, {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarDetallePedido(idPedido: string, idPedidoDetalle: string, cantidad: number) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/detalles/${idPedidoDetalle}`, {
    method: "PATCH",
    body: JSON.stringify({ cantidad })
  }).then((response) => response.data);
}

export function eliminarDetallePedido(idPedido: string, idPedidoDetalle: string) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/detalles/${idPedidoDetalle}`, {
    method: "DELETE"
  }).then((response) => response.data);
}

export function actualizarEstadoPedido(idPedido: string, payload: PedidoEstadoPayload) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/estado`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function confirmarPedido(idPedido: string) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/confirmar`, {
    method: "POST"
  }).then((response) => response.data);
}

// Vista previa de "Repetir" (no crea nada) y la repeticion (crea el pedido nuevo, pendiente).
export function prepararRepeticionPedido(idPedido: string) {
  return apiFetch<{ ok: true; data: RepeticionPedido }>(`/api/pedidos/${idPedido}/repeticion`).then(
    (response) => response.data
  );
}

export function repetirPedido(idPedido: string) {
  return apiFetch<RespuestaPedido>(`/api/pedidos/${idPedido}/repetir`, { method: "POST" }).then(
    (response) => response.data
  );
}
