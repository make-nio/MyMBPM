import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { historialPreciosQuerySchema, listarAuditoriaQuerySchema } from "./auditoria.schemas";
import { auditoriaService } from "./auditoria.service";

export const auditoriaController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarAuditoriaQuerySchema, request.query);
    const registros = await auditoriaService.listar(query);

    responderExito(response, registros);
  },

  async listarPrecios(request: Request, response: Response) {
    const query = validar(historialPreciosQuerySchema, request.query);
    const puntos = await auditoriaService.listarPrecios(query);

    responderExito(response, puntos);
  }
};
