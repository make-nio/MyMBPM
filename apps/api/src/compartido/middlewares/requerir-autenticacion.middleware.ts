import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import { ErrorAutenticacion } from "../errores/error-autenticacion";
import { getEnv } from "../../config/env";
import { autenticacionRepository } from "../../modulos/autenticacion/autenticacion.repository";

type PayloadToken = {
  sub: string;
};

export async function requerirAutenticacion(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new ErrorAutenticacion("Token de acceso requerido"));
    return;
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, getEnv().jwtSecret) as PayloadToken;
    const idUsuario = BigInt(payload.sub);
    const usuario = await autenticacionRepository.obtenerUsuarioSanitizadoPorId(idUsuario);

    if (!usuario || !usuario.activo) {
      throw new ErrorAutenticacion("Usuario invalido o inactivo");
    }

    request.usuarioAutenticado = usuario;
    next();
  } catch (error) {
    next(
      error instanceof ErrorAutenticacion
        ? error
        : new ErrorAutenticacion("Token invalido o expirado")
    );
  }
}
