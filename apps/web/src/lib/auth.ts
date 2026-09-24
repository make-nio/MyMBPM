import { apiFetch, ErrorApi } from "./api";
import { RespuestaLogin, RespuestaMe, UsuarioAutenticado } from "../types/auth";

const TOKEN_KEY = "mlm_bpm_token";

type CredencialesLogin = {
  identificador: string;
  password: string;
};

export function guardarToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function leerToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function limpiarSesion() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(credenciales: CredencialesLogin) {
  const response = await apiFetch<RespuestaLogin>("/api/autenticacion/login", {
    method: "POST",
    body: JSON.stringify(credenciales)
  });

  guardarToken(response.data.token);

  return response.data;
}

export async function obtenerUsuarioAutenticado(token: string): Promise<UsuarioAutenticado> {
  const response = await apiFetch<RespuestaMe>("/api/autenticacion/me", {
    token
  });

  return response.data;
}

// Devuelve la sesion vigente o null si no hay token o la API lo rechaza (401: invalido, vencido
// o usuario inactivo); en ese caso borra el token. Ante otros errores (red caida, request
// abortada por una recarga, 5xx) conserva el token y relanza: no es motivo para cerrar sesion.
export async function resolverSesionActual() {
  const token = leerToken();

  if (!token) {
    return null;
  }

  try {
    const usuario = await obtenerUsuarioAutenticado(token);

    return {
      token,
      usuario
    };
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) {
      limpiarSesion();
      return null;
    }

    throw error;
  }
}
