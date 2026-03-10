import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarEstadoSolicitudEspecialSchema,
  actualizarSolicitudEspecialSchema,
  crearSolicitudEspecialSchema,
  listarSolicitudesEspecialesQuerySchema,
  solicitudEspecialParamsSchema
} from "./solicitudes-especiales.schemas";
import { solicitudesEspecialesService } from "./solicitudes-especiales.service";

export const solicitudesEspecialesController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarSolicitudesEspecialesQuerySchema, request.query);
    const solicitudes = await solicitudesEspecialesService.listar(query);

    responderExito(response, solicitudes);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(solicitudEspecialParamsSchema, request.params);
    const solicitud = await solicitudesEspecialesService.obtenerPorId(params.id);

    responderExito(response, solicitud);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearSolicitudEspecialSchema, request.body);
    const solicitud = await solicitudesEspecialesService.crear(body);

    responderExito(response, solicitud, 201);
  },

  async actualizar(request: Request, response: Response) {
    const params = validar(solicitudEspecialParamsSchema, request.params);
    const body = validar(actualizarSolicitudEspecialSchema, request.body);
    const solicitud = await solicitudesEspecialesService.actualizar(params.id, body);

    responderExito(response, solicitud);
  },

  async cambiarEstado(request: Request, response: Response) {
    const params = validar(solicitudEspecialParamsSchema, request.params);
    const body = validar(actualizarEstadoSolicitudEspecialSchema, request.body);
    const solicitud = await solicitudesEspecialesService.cambiarEstado(
      params.id,
      body.estadoSolicitud
    );

    responderExito(response, solicitud);
  }
};
