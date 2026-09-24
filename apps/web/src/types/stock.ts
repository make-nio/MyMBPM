import type { CuerpoDe, RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type MovimientoStock = RespuestaDe<"get /api/stock/historial">[number];
export type StockActual = RespuestaDe<"get /api/stock/actual">;
export type Existencia = RespuestaDe<"get /api/stock/existencias">[number];

export type TipoStock = MovimientoStock["tipoStock"];
export type TipoAjuste = CuerpoDe<"post /api/stock/ajustes">["tipoMovimiento"];
