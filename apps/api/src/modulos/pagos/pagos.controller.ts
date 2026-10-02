import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import { anularPagoSchema, pagoParamsSchema, pagosParamsSchema, registrarPagoSchema } from "./pagos.schemas";
import { pagosService } from "./pagos.service";

export const pagosController = {
  async listar(request: Request, response: Response) {
    const params = validar(pagosParamsSchema, request.params);

    responderExito(response, await pagosService.listar(params.id));
  },

  async registrar(request: Request, response: Response) {
    const params = validar(pagosParamsSchema, request.params);
    const body = validar(registrarPagoSchema, request.body);
    // El pago queda a nombre del usuario de la sesion.
    const resultado = await pagosService.registrar(params.id, body, request.usuarioAutenticado?.idUsuario);

    responderExito(response, resultado, 201);
  },

  async anular(request: Request, response: Response) {
    const params = validar(pagoParamsSchema, request.params);
    const body = validar(anularPagoSchema, request.body);
    const resultado = await pagosService.anular(params.id, params.pagoId, body.motivo, request.usuarioAutenticado?.idUsuario);

    responderExito(response, resultado);
  }
};
