import { pedirApi } from "../api";
import { EstadoCobro, EstadoPedido, PedidoAltaPayload, PedidoEstadoPayload } from "../../types/pedidos";

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

export function listarPedidos(filtros: FiltrosPedidos = {}) {
  return pedirApi("get /api/pedidos", {
    consulta: {
      idCliente: filtros.idCliente,
      estadoPedido: filtros.estadoPedido,
      estadoCobro: filtros.estadoCobro,
      desde: filtros.desde,
      hasta: filtros.hasta,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function obtenerPedido(idPedido: string) {
  return pedirApi("get /api/pedidos/{id}", { params: { id: idPedido } });
}

export function crearPedido(payload: PedidoAltaPayload) {
  return pedirApi("post /api/pedidos", { cuerpo: payload });
}

export function agregarDetallePedido(idPedido: string, payload: { idItemCatalogo: string; cantidad: number }) {
  return pedirApi("post /api/pedidos/{id}/detalles", { params: { id: idPedido }, cuerpo: payload });
}

export function actualizarDetallePedido(idPedido: string, idPedidoDetalle: string, cantidad: number) {
  return pedirApi("patch /api/pedidos/{id}/detalles/{detalleId}", {
    params: { id: idPedido, detalleId: idPedidoDetalle },
    cuerpo: { cantidad }
  });
}

export function eliminarDetallePedido(idPedido: string, idPedidoDetalle: string) {
  return pedirApi("delete /api/pedidos/{id}/detalles/{detalleId}", {
    params: { id: idPedido, detalleId: idPedidoDetalle }
  });
}

export function actualizarEstadoPedido(idPedido: string, payload: PedidoEstadoPayload) {
  return pedirApi("patch /api/pedidos/{id}/estado", { params: { id: idPedido }, cuerpo: payload });
}

export function confirmarPedido(idPedido: string) {
  return pedirApi("post /api/pedidos/{id}/confirmar", { params: { id: idPedido } });
}

// Vista previa de "Repetir" (no crea nada) y la repeticion (crea el pedido nuevo, pendiente).
export function prepararRepeticionPedido(idPedido: string) {
  return pedirApi("get /api/pedidos/{id}/repeticion", { params: { id: idPedido } });
}

export function repetirPedido(idPedido: string) {
  return pedirApi("post /api/pedidos/{id}/repetir", { params: { id: idPedido } });
}
