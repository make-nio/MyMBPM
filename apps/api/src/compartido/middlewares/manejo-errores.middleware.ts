import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errores/error-aplicacion";

export function manejoErroresMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ErrorAplicacion) {
    response.status(error.statusCode).json({
      ok: false,
      error: {
        codigo: error.codigo,
        message: error.message,
        detalles: error.detalles ?? null
      }
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        ok: false,
        error: {
          codigo: "CONFLICTO",
          message: "Ya existe un registro con un valor unico duplicado",
          detalles: error.meta ?? null
        }
      });
      return;
    }

    if (error.code === "P2003") {
      response.status(409).json({
        ok: false,
        error: {
          codigo: "CONFLICTO",
          message: "La operacion viola una relacion existente",
          detalles: error.meta ?? null
        }
      });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({
        ok: false,
        error: {
          codigo: "NO_ENCONTRADO",
          message: "Registro no encontrado"
        }
      });
      return;
    }
  }

  console.error(error);

  response.status(500).json({
    ok: false,
    error: {
      codigo: "ERROR_INTERNO",
      message: "Ocurrio un error interno"
    }
  });
}
