import { apiFetch } from "./api";
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
  } catch {
    limpiarSesion();
    return null;
  }
}
