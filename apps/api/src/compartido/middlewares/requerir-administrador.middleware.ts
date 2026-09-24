import { NextFunction, Request, Response } from "express";

import { ErrorAutenticacion } from "../errores/error-autenticacion";
import { ErrorProhibido } from "../errores/error-prohibido";

// Va despues de requerirAutenticacion: exige que el usuario autenticado sea administrador.
export function requerirAdministrador(request: Request, _response: Response, next: NextFunction) {
  if (!request.usuarioAutenticado) {
    next(new ErrorAutenticacion("Token de acceso requerido"));
    return;
  }

  if (!request.usuarioAutenticado.esAdministrador) {
    next(new ErrorProhibido("Solo un administrador puede gestionar usuarios"));
    return;
  }

  next();
}
