import { Prisma } from "@prisma/client";

import { OFFSET_ARGENTINA_MS } from "../../compartido/dominio/fecha-argentina";

// Del primer instante del mes en curso (hora de Argentina) al primero del mes siguiente.
export function rangoMesArgentina(ahora: Date) {
  const local = new Date(ahora.getTime() - OFFSET_ARGENTINA_MS);
  const anio = local.getUTCFullYear();
  const mes = local.getUTCMonth();

  return {
    desde: new Date(Date.UTC(anio, mes, 1) + OFFSET_ARGENTINA_MS),
    hasta: new Date(Date.UTC(anio, mes + 1, 1) + OFFSET_ARGENTINA_MS)
  };
}

type PedidoVendido = {
  total: Prisma.Decimal;
  detalles: Array<{ cantidad: Prisma.Decimal; costoUnitario: Prisma.Decimal }>;
};

// Vendido = total de los pedidos; costo = el costo de cada linea guardado al cargarla (snapshot);
// ganancia = vendido - costo. Las lineas sin costo cargado cuentan como costo 0: se informan para
// que la ganancia no parezca mejor de lo que es.
export function calcularVentas(pedidos: PedidoVendido[]) {
  let vendido = new Prisma.Decimal(0);
  let costo = new Prisma.Decimal(0);
  let lineasSinCosto = 0;

  for (const pedido of pedidos) {
    vendido = vendido.add(pedido.total);

    for (const detalle of pedido.detalles) {
      costo = costo.add(detalle.costoUnitario.mul(detalle.cantidad));

      if (detalle.costoUnitario.isZero()) {
        lineasSinCosto += 1;
      }
    }
  }

  return { pedidos: pedidos.length, vendido, costo, ganancia: vendido.sub(costo), lineasSinCosto };
}
