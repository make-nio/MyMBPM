import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import { tokenAnteriorAlCorte } from "../dominio/sesion";
import { ErrorAutenticacion } from "../errores/error-autenticacion";
import { getEnv } from "../../config/env";
import { autenticacionRepository } from "../../modulos/autenticacion/autenticacion.repository";

type PayloadToken = {
  sub: string;
  iat?: number;
};

async function resolverUsuarioAutenticado(request: Request) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.replace("Bearer ", "").trim();
  const payload = jwt.verify(token, getEnv().jwtSecret) as PayloadToken;
  const idUsuario = BigInt(payload.sub);
  const [usuario, validasDesde] = await Promise.all([
    autenticacionRepository.obtenerUsuarioSanitizadoPorId(idUsuario),
    autenticacionRepository.obtenerSesionesValidasDesde(idUsuario)
  ]);

  if (!usuario || !usuario.activo) {
    throw new ErrorAutenticacion("Usuario invalido o inactivo");
  }

  // Un administrador cerro las sesiones del usuario (o se le restablecio la clave).
  if (tokenAnteriorAlCorte(payload.iat, validasDesde)) {
    throw new ErrorAutenticacion("La sesion se cerro: ingresa de nuevo");
  }

  return usuario;
}

export async function requerirAutenticacion(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    const usuario = await resolverUsuarioAutenticado(request);

    if (!usuario) {
      next(new ErrorAutenticacion("Token de acceso requerido"));
      return;
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

export async function cargarAutenticacionOpcional(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    const usuario = await resolverUsuarioAutenticado(request);

    if (usuario) {
      request.usuarioAutenticado = usuario;
    }

    next();
  } catch (error) {
    next(
      error instanceof ErrorAutenticacion
        ? error
        : new ErrorAutenticacion("Token invalido o expirado")
    );
  }
}
