import type { CuerpoDe, RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type PagosDelPedido = RespuestaDe<"get /api/pedidos/{id}/pagos">;
export type Pago = PagosDelPedido["pagos"][number];
export type MedioPago = Pago["medioPago"];
export type RegistrarPagoPayload = CuerpoDe<"post /api/pedidos/{id}/pagos">;
export type CobrosDelMes = RespuestaDe<"get /api/reportes/cobros-mes">;

export const MEDIOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO", "TARJETA", "OTRO"] as const;
// No compila si la lista no tiene exactamente los valores del contrato.
export type MediosPagoCompletos = Afirmar<ListaCompleta<typeof MEDIOS_PAGO, MedioPago>>;
