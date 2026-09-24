import { Request, Response } from "express";

import { puedeVerCostos } from "../../compartido/dominio/permisos";
import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { resumenPanelQuerySchema } from "./panel.schemas";
import { panelService } from "./panel.service";

export const panelController = {
  async obtenerResumen(request: Request, response: Response) {
    const query = validar(resumenPanelQuerySchema, request.query);
    const resumen = await panelService.obtenerResumen(query, { verCostos: puedeVerCostos(request.usuarioAutenticado) });

    responderExito(response, resumen);
  },

  async obtenerAvisos(_request: Request, response: Response) {
    responderExito(response, await panelService.obtenerAvisos());
  }
};
