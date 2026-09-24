import { pedirApi } from "../api";
import { UsuarioAltaPayload, UsuarioEdicionPayload } from "../../types/usuarios";

type FiltrosUsuarios = {
  activo?: boolean;
  limit?: number;
  offset?: number;
};

export function listarUsuarios(filtros: FiltrosUsuarios = {}) {
  return pedirApi("get /api/usuarios", {
    consulta: {
      activo: filtros.activo,
      limit: filtros.limit ?? 100,
      offset: filtros.offset ?? 0
    }
  });
}

export function crearUsuario(payload: UsuarioAltaPayload) {
  return pedirApi("post /api/usuarios", { cuerpo: payload });
}

export function actualizarUsuario(idUsuario: string, payload: UsuarioEdicionPayload) {
  return pedirApi("patch /api/usuarios/{id}", { params: { id: idUsuario }, cuerpo: payload });
}

export function cambiarEstadoUsuario(idUsuario: string, activo: boolean) {
  return pedirApi("patch /api/usuarios/{id}/estado", { params: { id: idUsuario }, cuerpo: { activo } });
}

export function restablecerClaveUsuario(idUsuario: string, passwordNueva: string) {
  return pedirApi("patch /api/usuarios/{id}/restablecer-clave", {
    params: { id: idUsuario },
    cuerpo: { passwordNueva }
  });
}

// Cierra la sesion del usuario en todos los dispositivos (solo administradores).
export function cerrarSesionesUsuario(idUsuario: string) {
  return pedirApi("post /api/usuarios/{id}/cerrar-sesiones", { params: { id: idUsuario } });
}
