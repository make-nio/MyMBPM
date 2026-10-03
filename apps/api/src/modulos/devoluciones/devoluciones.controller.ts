import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { devolucionesParamsSchema, registrarDevolucionSchema } from "./devoluciones.schemas";
import { devolucionesService } from "./devoluciones.service";

export const devolucionesController = {
  async listar(request: Request, response: Response) {
    const params = validar(devolucionesParamsSchema, request.params);

    responderExito(response, await devolucionesService.listar(params.id));
  },

  async registrar(request: Request, response: Response) {
    const params = validar(devolucionesParamsSchema, request.params);
    const body = validar(registrarDevolucionSchema, request.body);
    // La devolucion (y su reintegro, si hay) queda a nombre del usuario de la sesion. El reintegro
    // es solo de administradores (lo decide el service, que sabe si hay plata para reintegrar).
    const resultado = await devolucionesService.registrar(
      params.id,
      body,
      request.usuarioAutenticado?.idUsuario,
      request.usuarioAutenticado?.esAdministrador === true
    );

    responderExito(response, resultado, 201);
  }
};
