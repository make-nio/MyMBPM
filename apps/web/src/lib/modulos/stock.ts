import { apiFetch, buildQuery } from "../api";
import { MovimientoStock, StockActual, TipoStock } from "../../types/stock";

export function obtenerStockActual(idItemCatalogo: string, tipoStock: TipoStock = "PRODUCTO") {
  return apiFetch<{ ok: true; data: StockActual }>(
    `/api/stock/actual${buildQuery({ idItemCatalogo, tipoStock })}`
  ).then((response) => response.data);
}

export function listarMovimientosStock(filtros: {
  idItemCatalogo: string;
  tipoStock?: TipoStock;
  limit?: number;
  offset?: number;
}) {
  return apiFetch<{ ok: true; data: MovimientoStock[] }>(
    `/api/stock/historial${buildQuery({
      idItemCatalogo: filtros.idItemCatalogo,
      tipoStock: filtros.tipoStock,
      limit: filtros.limit ?? 50,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}
