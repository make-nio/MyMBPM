import { Request, Response } from "express";

export function noEncontradoMiddleware(_request: Request, response: Response) {
  response.status(404).json({
    ok: false,
    error: {
      codigo: "NO_ENCONTRADO",
      message: "Ruta no encontrada"
    }
  });
}

