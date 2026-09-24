declare namespace Express {
  interface Request {
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
