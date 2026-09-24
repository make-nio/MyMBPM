import type { CuerpoDe, RespuestaDe } from "@contrato";

import type { Afirmar, ListaCompleta } from "./contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
// El listado trae la categoria y las imagenes activas; el detalle, ademas, la receta.
export type ItemCatalogo = RespuestaDe<"get /api/items-catalogo">[number];
export type ItemCatalogoDetalle = RespuestaDe<"get /api/items-catalogo/{id}">;
export type ItemCatalogoImagen = ItemCatalogoDetalle["imagenes"][number];
export type ItemCatalogoComponente = RespuestaDe<"get /api/items-catalogo/{id}/componentes">[number];

export type TipoItem = ItemCatalogo["tipoItem"];
export const TIPOS_ITEM = ["PRODUCTO", "INSUMO"] as const;
// No compila si la lista no tiene exactamente los tipos del contrato.
export type TiposItemCompletos = Afirmar<ListaCompleta<typeof TIPOS_ITEM, TipoItem>>;

export type ItemCatalogoPayload = CuerpoDe<"post /api/items-catalogo">;
export type ItemCatalogoComponentePayload = CuerpoDe<"post /api/items-catalogo/{id}/componentes">;
