export type UsuarioAutenticado = {
  idUsuario: string;
  nombre: string;
  apellido: string | null;
  email: string;
  usuario: string;
  activo: boolean;
  fechaAlta: string;
  fechaModificacion: string;
};

export type RespuestaApi<T> = {
  ok: boolean;
  data: T;
};

export type RespuestaLogin = RespuestaApi<{
  token: string;
  usuario: UsuarioAutenticado;
}>;

export type RespuestaMe = RespuestaApi<UsuarioAutenticado>;
