import { pedirApi } from "../api";
import { RegistrarDevolucionPayload } from "../../types/devoluciones";

export function listarDevoluciones(idPedido: string) {
  return pedirApi("get /api/pedidos/{id}/devoluciones", { params: { id: idPedido } });
}

export function registrarDevolucion(idPedido: string, payload: RegistrarDevolucionPayload) {
  return pedirApi("post /api/pedidos/{id}/devoluciones", { params: { id: idPedido }, cuerpo: payload });
}

// Cuanto se devolvio ya de cada linea del pedido, sumando todas sus devoluciones.
export function cantidadesDevueltas(devoluciones: { detalles: { idPedidoDetalle: string; cantidad: string }[] }[]) {
  const porLinea = new Map<string, number>();

  for (const devolucion of devoluciones) {
    for (const detalle of devolucion.detalles) {
      porLinea.set(detalle.idPedidoDetalle, (porLinea.get(detalle.idPedidoDetalle) ?? 0) + Number(detalle.cantidad));
    }
  }

  return porLinea;
}
