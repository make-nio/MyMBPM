import { apiFetch, buildQuery } from "../api";
import { Usuario, UsuarioAltaPayload, UsuarioEdicionPayload } from "../../types/usuarios";

type FiltrosUsuarios = {
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarUsuarios(filtros: FiltrosUsuarios = {}) {
  return apiFetch<{ ok: true; data: Usuario[] }>(
    `/api/usuarios${buildQuery({
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    })}`
  ).then((response) => response.data);
}

export function crearUsuario(payload: UsuarioAltaPayload) {
  return apiFetch<{ ok: true; data: Usuario }>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function actualizarUsuario(idUsuario: string, payload: UsuarioEdicionPayload) {
  return apiFetch<{ ok: true; data: Usuario }>(`/api/usuarios/${idUsuario}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }).then((response) => response.data);
}

export function cambiarEstadoUsuario(idUsuario: string, activo: boolean) {
  return apiFetch<{ ok: true; data: Usuario }>(`/api/usuarios/${idUsuario}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  }).then((response) => response.data);
}

export function restablecerClaveUsuario(idUsuario: string, passwordNueva: string) {
  return apiFetch<{ ok: true; data: Usuario }>(`/api/usuarios/${idUsuario}/restablecer-clave`, {
    method: "PATCH",
    body: JSON.stringify({ passwordNueva })
  }).then((response) => response.data);
}
