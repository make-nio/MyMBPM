import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { ventasMesQuerySchema } from "./reportes.schemas";
import { reportesService } from "./reportes.service";

export const reportesController = {
  async ventasDelMes(request: Request, response: Response) {
    const query = validar(ventasMesQuerySchema, request.query);
    const reporte = await reportesService.ventasDelMes(query);

    responderExito(response, reporte);
  }
};
