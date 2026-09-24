import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { resumenPanelQuerySchema } from "./panel.schemas";
import { panelService } from "./panel.service";

export const panelController = {
  async obtenerResumen(request: Request, response: Response) {
    const query = validar(resumenPanelQuerySchema, request.query);
    const resumen = await panelService.obtenerResumen(query);

    responderExito(response, resumen);
  }
};
