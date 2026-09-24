import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { importacionClientesSchema } from "./importacion-clientes.schemas";
import { importacionClientesService } from "./importacion-clientes.service";

export const importacionClientesController = {
  async previsualizar(request: Request, response: Response) {
    const { filas } = validar(importacionClientesSchema, request.body);
    responderExito(response, await importacionClientesService.previsualizar(filas));
  },

  async importar(request: Request, response: Response) {
    const { filas } = validar(importacionClientesSchema, request.body);
    const resultado = await importacionClientesService.importar(filas, request.usuarioAutenticado?.idUsuario);
    responderExito(response, resultado, 201);
  }
};
