import { apiFetch, buildQuery } from "../api";
import {
  ItemCatalogo,
  ItemCatalogoComponente,
  ItemCatalogoComponentePayload,
  ItemCatalogoPayload,
  TipoItem
} from "../../types/items-catalogo";

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
  return apiFetch<{ ok: true; data: ItemCatalogo[] }>(
    `/api/items-catalogo${buildQuery({
      busqueda: filtros.busqueda,
      tipoItem: filtros.tipoItem,
      idCategoria: filtros.idCategoria,
      activo: filtros.activo,
      publico: filtros.publico,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function obtenerItemCatalogo(idItemCatalogo: string) {
  return apiFetch<{ ok: true; data: ItemCatalogo }>(`/api/items-catalogo/${idItemCatalogo}`).then(
    (response) => response.data
  );
}

export function crearItemCatalogo(payload: ItemCatalogoPayload) {
  return apiFetch<{ ok: true; data: ItemCatalogo }>("/api/items-catalogo", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarItemCatalogo(
  idItemCatalogo: string,
  payload: Partial<ItemCatalogoPayload>
) {
  return apiFetch<{ ok: true; data: ItemCatalogo }>(`/api/items-catalogo/${idItemCatalogo}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function cambiarEstadoItemCatalogo(idItemCatalogo: string, activo: boolean) {
  return apiFetch<{ ok: true; data: ItemCatalogo }>(
    `/api/items-catalogo/${idItemCatalogo}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo })
    }
  ).then((response) => response.data);
}

export function listarComponentesItem(idItemCatalogo: string) {
  return apiFetch<{ ok: true; data: ItemCatalogoComponente[] }>(
    `/api/items-catalogo/${idItemCatalogo}/componentes`
  ).then((response) => response.data);
}

export function crearComponenteItem(
  idItemCatalogo: string,
  payload: ItemCatalogoComponentePayload
) {
  return apiFetch<{ ok: true; data: ItemCatalogoComponente }>(
    `/api/items-catalogo/${idItemCatalogo}/componentes`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  ).then((response) => response.data);
}

export function actualizarComponenteItem(
  idItemCatalogo: string,
  idComponente: string,
  payload: Partial<ItemCatalogoComponentePayload>
) {
  return apiFetch<{ ok: true; data: ItemCatalogoComponente }>(
    `/api/items-catalogo/${idItemCatalogo}/componentes/${idComponente}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  ).then((response) => response.data);
}

export function eliminarComponenteItem(idItemCatalogo: string, idComponente: string) {
  return apiFetch<{ ok: true; data: { eliminado: boolean } }>(
    `/api/items-catalogo/${idItemCatalogo}/componentes/${idComponente}`,
    {
      method: "DELETE"
    }
  ).then((response) => response.data);
}

// Items activos que coinciden con el texto, para elegir uno en un formulario.
export function buscarItemsActivos(texto: string, limit: number, tipoItem?: TipoItem) {
  return listarItemsCatalogo({ busqueda: texto || undefined, tipoItem, activo: true, limit });
}
