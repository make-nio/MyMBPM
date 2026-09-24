import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { importacionCatalogoSchema } from "./importacion-catalogo.schemas";
import { importacionCatalogoService } from "./importacion-catalogo.service";

export const importacionCatalogoController = {
  async previsualizar(request: Request, response: Response) {
    const { filas } = validar(importacionCatalogoSchema, request.body);
    responderExito(response, await importacionCatalogoService.previsualizar(filas));
  },

  async importar(request: Request, response: Response) {
    const { filas } = validar(importacionCatalogoSchema, request.body);
    const resultado = await importacionCatalogoService.importar(filas, request.usuarioAutenticado?.idUsuario);
    responderExito(response, resultado, 201);
  }
};
