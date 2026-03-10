import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { autenticacionService } from "./autenticacion.service";
import { loginSchema } from "./autenticacion.schemas";

export const autenticacionController = {
  async login(request: Request, response: Response) {
    const body = validar(loginSchema, request.body);
    const data = await autenticacionService.login(body);

    responderExito(response, data);
  },

  async me(request: Request, response: Response) {
    const usuario = await autenticacionService.obtenerUsuarioActual(
      request.usuarioAutenticado!.idUsuario
    );

    responderExito(response, usuario);
  }
};
