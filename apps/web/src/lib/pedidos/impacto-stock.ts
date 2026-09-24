import { PedidoDetalle } from "../../types/pedidos";

export type ImpactoStockItem = {
  idItemCatalogo: string;
  nombre: string;
  disponible: number;
  egreso: number;
  resultante: number;
  insuficiente: boolean;
};

// Anticipa lo que hara "Confirmar pedido": un egreso de stock de PRODUCTO por cada linea.
// Si el mismo item aparece en varias lineas, los egresos se suman contra el mismo stock.
// Es informativo: la validacion real la hace la API dentro de la transaccion de confirmacion.
export function calcularImpactoStock(
  detalles: Pick<PedidoDetalle, "idItemCatalogo" | "nombreItemSnapshot" | "cantidad">[],
  stockDisponible: Record<string, string | number>
): ImpactoStockItem[] {
  const porItem = new Map<string, ImpactoStockItem>();

  for (const detalle of detalles) {
    const existente = porItem.get(detalle.idItemCatalogo);
    const egreso = Number(detalle.cantidad);

    if (existente) {
      existente.egreso += egreso;
      continue;
    }

    porItem.set(detalle.idItemCatalogo, {
      idItemCatalogo: detalle.idItemCatalogo,
      nombre: detalle.nombreItemSnapshot,
      disponible: Number(stockDisponible[detalle.idItemCatalogo] ?? 0),
      egreso,
      resultante: 0,
      insuficiente: false
    });
  }

  return [...porItem.values()].map((item) => {
    // Redondeo a 3 decimales (la precision de CANTIDAD) para evitar 0.30000000000000004.
    // "+ 0" normaliza -0 (por ejemplo 0.3 - 0.3), que se mostraria como "-0".
    const resultante = Math.round((item.disponible - item.egreso) * 1000) / 1000 + 0;
    return { ...item, resultante, insuficiente: resultante < 0 };
  });
}

export function hayStockInsuficiente(impacto: ImpactoStockItem[]) {
  return impacto.some((item) => item.insuficiente);
}
