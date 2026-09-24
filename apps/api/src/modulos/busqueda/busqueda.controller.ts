import { Request, Response } from "express";

import { puedeVerCostos } from "../../compartido/dominio/permisos";
import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { buscarQuerySchema } from "./busqueda.schemas";
import { busquedaService } from "./busqueda.service";

export const busquedaController = {
  async buscar(request: Request, response: Response) {
    const query = validar(buscarQuerySchema, request.query);
    const resultados = await busquedaService.buscar(query.q, { verCostos: puedeVerCostos(request.usuarioAutenticado) });

    responderExito(response, resultados);
  }
};
