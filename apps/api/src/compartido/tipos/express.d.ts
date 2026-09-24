declare namespace Express {
  interface Request {
    // Codigo corto de esta solicitud HTTP (ver referencia.middleware): sale en el log y en la
    // respuesta de un error, para encontrar en el log lo que reporta quien usa el sistema.
    referencia?: string;
    usuarioAutenticado?: {
      idUsuario: bigint;
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      activo: boolean;
      esAdministrador: boolean;
      fechaAlta: Date;
      fechaModificacion: Date;
    };
  }
}
