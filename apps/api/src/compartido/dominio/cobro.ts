import { Prisma } from "@prisma/client";

import { EstadoCobro } from "./enums";

// Estado de cobro de un pedido segun lo cobrado (pagos vigentes). Un pedido sin ningun pago
// registrado (ni anulado) conserva el estado que tenia: los pedidos de antes de los pagos se
// marcaban a mano y no se les inventan pagos (#90).
export function calcularEstadoCobro(
  total: Prisma.Decimal,
  cobrado: Prisma.Decimal,
  tienePagos: boolean
): EstadoCobro | null {
  if (!tienePagos) {
    return null;
  }

  if (cobrado.lessThanOrEqualTo(0)) {
    return "PENDIENTE";
  }

  return cobrado.greaterThanOrEqualTo(total) ? "PAGADO" : "SEÑADO";
}
