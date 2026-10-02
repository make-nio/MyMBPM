import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { actualizarConfiguracionSchema } from "./configuracion.schemas";
import { configuracionService } from "./configuracion.service";

export const configuracionController = {
  async obtener(_request: Request, response: Response) {
    responderExito(response, await configuracionService.obtener());
  },

  async actualizar(request: Request, response: Response) {
    const body = validar(actualizarConfiguracionSchema, request.body);

    responderExito(response, await configuracionService.actualizar(body));
  }
};
