import type { RespuestaDe } from "@contrato";

// Tipos sacados del contrato de la API (apps/api/src/contrato): no se escriben a mano.
export type UsuarioAutenticado = RespuestaDe<"get /api/autenticacion/me">;

export type RespuestaApi<T> = {
  ok: boolean;
  data: T;
};

export type RespuestaLogin = RespuestaApi<RespuestaDe<"post /api/autenticacion/login">>;

export type RespuestaMe = RespuestaApi<UsuarioAutenticado>;
