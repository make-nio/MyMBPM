export type Usuario = {
  idUsuario: string;
  nombre: string;
  apellido: string;
  email: string;
  usuario: string;
  activo: boolean;
  esAdministrador: boolean;
  fechaAlta: string;
  fechaModificacion: string;
};

export type UsuarioAltaPayload = {
  nombre: string;
  apellido: string;
  email: string;
  usuario: string;
  password: string;
  activo?: boolean;
  esAdministrador?: boolean;
};

export type UsuarioEdicionPayload = Partial<{
  nombre: string;
  apellido: string;
  email: string;
  usuario: string;
  esAdministrador: boolean;
}>;
