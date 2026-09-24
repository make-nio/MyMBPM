import { pedirApi } from "../api";
import { CategoriaPayload } from "../../types/categorias";

type FiltrosCategorias = {
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarCategorias(filtros: FiltrosCategorias = {}) {
  return pedirApi("get /api/categorias", {
    consulta: {
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function crearCategoria(payload: CategoriaPayload) {
  return pedirApi("post /api/categorias", { cuerpo: payload });
}

export function actualizarCategoria(idCategoria: string, payload: Partial<CategoriaPayload>) {
  return pedirApi("patch /api/categorias/{id}", { params: { id: idCategoria }, cuerpo: payload });
}

export function cambiarEstadoCategoria(idCategoria: string, activo: boolean) {
  return pedirApi("patch /api/categorias/{id}/estado", { params: { id: idCategoria }, cuerpo: { activo } });
}
