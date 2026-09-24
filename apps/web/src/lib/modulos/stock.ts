import { pedirApi } from "../api";
import { TipoAjuste, TipoStock } from "../../types/stock";

export function obtenerStockActual(idItemCatalogo: string, tipoStock: TipoStock = "PRODUCTO") {
  return pedirApi("get /api/stock/actual", { consulta: { idItemCatalogo, tipoStock } });
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
  return pedirApi("get /api/stock/historial", {
    consulta: {
      idItemCatalogo: filtros.idItemCatalogo,
      tipoStock: filtros.tipoStock,
      origenMovimiento: filtros.origenMovimiento,
      idReferenciaOrigen: filtros.idReferenciaOrigen,
      limit: filtros.limit ?? 50,
      offset: filtros.offset ?? 0
    }
  });
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
  return pedirApi("get /api/stock/existencias", {
    consulta: {
      tipoItem: filtros.tipoItem,
      activo: filtros.activo,
      busqueda: filtros.busqueda,
      soloBajoMinimo: filtros.soloBajoMinimo,
      limit: filtros.limit,
      offset: filtros.offset
    }
  });
}

// Ajuste manual: el usuario lo toma la API de la sesion y el origen queda MANUAL.
export function crearAjusteStock(payload: {
  idItemCatalogo: string;
  tipoStock: TipoStock;
  tipoMovimiento: TipoAjuste;
  cantidad: number;
  observaciones: string;
}) {
  return pedirApi("post /api/stock/ajustes", { cuerpo: payload });
}
