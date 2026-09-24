import { apiFetch, buildQuery } from "../api";
import { Existencia, MovimientoStock, StockActual, TipoAjuste, TipoStock } from "../../types/stock";

export function obtenerStockActual(idItemCatalogo: string, tipoStock: TipoStock = "PRODUCTO") {
  return apiFetch<{ ok: true; data: StockActual }>(
    `/api/stock/actual${buildQuery({ idItemCatalogo, tipoStock })}`
  ).then((response) => response.data);
}

export function listarMovimientosStock(filtros: {
  idItemCatalogo: string;
  tipoStock?: TipoStock;
  // Movimientos de un pedido u orden puntual.
  origenMovimiento?: "MANUAL" | "PEDIDO" | "PRODUCCION";
  idReferenciaOrigen?: string;
  limit?: number;
  offset?: number;
}) {
  return apiFetch<{ ok: true; data: MovimientoStock[] }>(
    `/api/stock/historial${buildQuery({
      idItemCatalogo: filtros.idItemCatalogo,
      tipoStock: filtros.tipoStock,
      origenMovimiento: filtros.origenMovimiento,
      idReferenciaOrigen: filtros.idReferenciaOrigen,
      limit: filtros.limit ?? 50,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

// Sin limit la API devuelve todas; con limit, la pagina pedida (despues de aplicar los filtros).
export function listarExistencias(
  filtros: {
    tipoItem?: TipoStock;
    activo?: boolean;
    busqueda?: string;
    soloBajoMinimo?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  return apiFetch<{ ok: true; data: Existencia[] }>(
    `/api/stock/existencias${buildQuery({
      tipoItem: filtros.tipoItem,
      activo: filtros.activo,
      busqueda: filtros.busqueda,
      soloBajoMinimo: filtros.soloBajoMinimo,
      limit: filtros.limit,
      offset: filtros.offset
    })}`
  ).then((response) => response.data);
}

// Ajuste manual: el usuario lo toma la API de la sesion y el origen queda MANUAL.
export function crearAjusteStock(payload: {
  idItemCatalogo: string;
  tipoStock: TipoStock;
  tipoMovimiento: TipoAjuste;
  cantidad: number;
  observaciones: string;
}) {
  return apiFetch<{ ok: true; data: MovimientoStock }>("/api/stock/ajustes", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}
