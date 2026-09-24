import { TablaDatos } from "../../ui/tabla-datos";
import { formatearCantidad } from "../../../lib/formato";
import { ImpactoStockItem } from "../../../lib/stock/impacto-stock";

type TablaImpactoStockProps = {
  impacto: ImpactoStockItem[];
  etiquetaItem?: string;
  sentido?: "egreso" | "ingreso";
};

// Stock actual, movimiento previsto y stock resultante por item (pedidos y produccion).
export function TablaImpactoStock({ impacto, etiquetaItem = "Item", sentido = "egreso" }: TablaImpactoStockProps) {
  const signo = sentido === "egreso" ? "-" : "+";

  return (
    <TablaDatos
      columns={[
        { header: etiquetaItem, cell: (item) => item.nombre },
        { header: "Stock actual", cell: (item) => formatearCantidad(item.disponible) },
        { header: sentido === "egreso" ? "Sale" : "Entra", cell: (item) => `${signo}${formatearCantidad(item.egreso)}` },
        {
          header: "Queda",
          cell: (item) =>
            item.insuficiente
              ? `${formatearCantidad(item.resultante)} (insuficiente)`
              : formatearCantidad(item.resultante)
        }
      ]}
      data={impacto}
      keyExtractor={(item) => item.idItemCatalogo}
    />
  );
}
