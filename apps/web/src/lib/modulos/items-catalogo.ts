import { pedirApi } from "../api";
import { ItemCatalogoComponentePayload, ItemCatalogoPayload, TipoItem } from "../../types/items-catalogo";

type FiltrosItemsCatalogo = {
  busqueda?: string;
  tipoItem?: TipoItem;
  idCategoria?: string;
  activo?: boolean;
  publico?: boolean;
  limit?: number;
  offset?: number;
};

export function listarItemsCatalogo(filtros: FiltrosItemsCatalogo = {}) {
  return pedirApi("get /api/items-catalogo", {
    consulta: {
      busqueda: filtros.busqueda,
      tipoItem: filtros.tipoItem,
      idCategoria: filtros.idCategoria,
      activo: filtros.activo,
      publico: filtros.publico,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function obtenerItemCatalogo(idItemCatalogo: string) {
  return pedirApi("get /api/items-catalogo/{id}", { params: { id: idItemCatalogo } });
}

export function crearItemCatalogo(payload: ItemCatalogoPayload) {
  return pedirApi("post /api/items-catalogo", { cuerpo: payload });
}

export function actualizarItemCatalogo(
  idItemCatalogo: string,
  payload: Partial<ItemCatalogoPayload>
) {
  return pedirApi("patch /api/items-catalogo/{id}", { params: { id: idItemCatalogo }, cuerpo: payload });
}

export function cambiarEstadoItemCatalogo(idItemCatalogo: string, activo: boolean) {
  return pedirApi("patch /api/items-catalogo/{id}/estado", { params: { id: idItemCatalogo }, cuerpo: { activo } });
}

export function listarComponentesItem(idItemCatalogo: string) {
  return pedirApi("get /api/items-catalogo/{id}/componentes", { params: { id: idItemCatalogo } });
}

export function crearComponenteItem(
  idItemCatalogo: string,
  payload: ItemCatalogoComponentePayload
) {
  return pedirApi("post /api/items-catalogo/{id}/componentes", { params: { id: idItemCatalogo }, cuerpo: payload });
}

export function actualizarComponenteItem(
  idItemCatalogo: string,
  idComponente: string,
  payload: Partial<ItemCatalogoComponentePayload>
) {
  return pedirApi("patch /api/items-catalogo/{id}/componentes/{componenteId}", {
    params: { id: idItemCatalogo, componenteId: idComponente },
    cuerpo: payload
  });
}

export function eliminarComponenteItem(idItemCatalogo: string, idComponente: string) {
  return pedirApi("delete /api/items-catalogo/{id}/componentes/{componenteId}", {
    params: { id: idItemCatalogo, componenteId: idComponente }
  });
}

// Items activos que coinciden con el texto, para elegir uno en un formulario.
export function buscarItemsActivos(texto: string, limit: number, tipoItem?: TipoItem) {
  return listarItemsCatalogo({ busqueda: texto || undefined, tipoItem, activo: true, limit });
}
