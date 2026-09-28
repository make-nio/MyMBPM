import { pedirApi } from "../api";
import { RegistrarPagoPayload } from "../../types/pagos";

export function listarPagos(idPedido: string) {
  return pedirApi("get /api/pedidos/{id}/pagos", { params: { id: idPedido } });
}

export function registrarPago(idPedido: string, payload: RegistrarPagoPayload) {
  return pedirApi("post /api/pedidos/{id}/pagos", { params: { id: idPedido }, cuerpo: payload });
}

// Solo administradores: el pago no se borra, queda anulado con el motivo.
export function anularPago(idPedido: string, idPago: string, motivo: string) {
  return pedirApi("post /api/pedidos/{id}/pagos/{pagoId}/anular", {
    params: { id: idPedido, pagoId: idPago },
    cuerpo: { motivo }
  });
}
