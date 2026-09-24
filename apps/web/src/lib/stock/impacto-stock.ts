// Una salida de stock prevista: cuanto de un item se va a descontar.
export type EgresoPrevisto = {
  idItemCatalogo: string;
  nombre: string;
  cantidad: string | number;
};

export type ImpactoStockItem = {
  idItemCatalogo: string;
  nombre: string;
  disponible: number;
  egreso: number;
  resultante: number;
  insuficiente: boolean;
};

// Anticipa el efecto de una operacion que descuenta stock (confirmar un pedido, iniciar una
// produccion). Si el mismo item aparece varias veces, los egresos se suman contra el mismo stock.
// Es informativo: la validacion real la hace la API dentro de la transaccion.
// Con sentido "ingreso" (finalizar una produccion) la cantidad se suma y nunca es insuficiente.
export function calcularImpactoStock(
  egresos: EgresoPrevisto[],
  stockDisponible: Record<string, string | number>,
  sentido: "egreso" | "ingreso" = "egreso"
): ImpactoStockItem[] {
  const porItem = new Map<string, ImpactoStockItem>();

  for (const detalle of egresos) {
    const existente = porItem.get(detalle.idItemCatalogo);
    const egreso = Number(detalle.cantidad);

    if (existente) {
      existente.egreso += egreso;
      continue;
    }

    porItem.set(detalle.idItemCatalogo, {
      idItemCatalogo: detalle.idItemCatalogo,
      nombre: detalle.nombre,
      disponible: Number(stockDisponible[detalle.idItemCatalogo] ?? 0) + 0,
      egreso,
      resultante: 0,
      insuficiente: false
    });
  }

  return [...porItem.values()].map((item) => {
    // Redondeo a 3 decimales (la precision de CANTIDAD) para evitar 0.30000000000000004.
    // "+ 0" normaliza -0 (por ejemplo 0.3 - 0.3), que se mostraria como "-0".
    const delta = sentido === "egreso" ? -item.egreso : item.egreso;
    const resultante = Math.round((item.disponible + delta) * 1000) / 1000 + 0;
    return { ...item, resultante, insuficiente: resultante < 0 };
  });
}

export function hayStockInsuficiente(impacto: ImpactoStockItem[]) {
  return impacto.some((item) => item.insuficiente);
}
