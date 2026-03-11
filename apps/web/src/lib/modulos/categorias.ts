import { apiFetch, buildQuery } from "../api";
import { Categoria, CategoriaPayload } from "../../types/categorias";

type FiltrosCategorias = {
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarCategorias(filtros: FiltrosCategorias = {}) {
  return apiFetch<{ ok: true; data: Categoria[] }>(
    `/api/categorias${buildQuery({
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function crearCategoria(payload: CategoriaPayload) {
  return apiFetch<{ ok: true; data: Categoria }>("/api/categorias", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarCategoria(idCategoria: string, payload: Partial<CategoriaPayload>) {
  return apiFetch<{ ok: true; data: Categoria }>(`/api/categorias/${idCategoria}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function cambiarEstadoCategoria(idCategoria: string, activo: boolean) {
  return apiFetch<{ ok: true; data: Categoria }>(
    `/api/categorias/${idCategoria}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo })
    }
  ).then((response) => response.data);
}
