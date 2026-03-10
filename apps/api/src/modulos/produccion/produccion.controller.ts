import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  accionProduccionSchema,
  actualizarEstadoProduccionSchema,
  actualizarDetalleProduccionSchema,
  agregarDetalleProduccionSchema,
  crearOrdenProduccionSchema,
  listarOrdenesProduccionQuerySchema,
  ordenProduccionDetalleParamsSchema,
  ordenProduccionParamsSchema
} from "./produccion.schemas";
import { produccionService } from "./produccion.service";

export const produccionController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarOrdenesProduccionQuerySchema, request.query);
    const ordenes = await produccionService.listar(query);

    responderExito(response, ordenes);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(ordenProduccionParamsSchema, request.params);
    const orden = await produccionService.obtenerPorId(params.id);

    responderExito(response, orden);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearOrdenProduccionSchema, request.body);
    const orden = await produccionService.crear(body);

    responderExito(response, orden, 201);
  },

  async agregarDetalle(request: Request, response: Response) {
    const params = validar(ordenProduccionParamsSchema, request.params);
    const body = validar(agregarDetalleProduccionSchema, request.body);
    const orden = await produccionService.agregarDetalle(params.id, body);

    responderExito(response, orden, 201);
  },

  async actualizarDetalle(request: Request, response: Response) {
    const params = validar(ordenProduccionDetalleParamsSchema, request.params);
    const body = validar(actualizarDetalleProduccionSchema, request.body);
    const orden = await produccionService.actualizarDetalle(params.id, params.detalleId, body);

    responderExito(response, orden);
  },

  async eliminarDetalle(request: Request, response: Response) {
    const params = validar(ordenProduccionDetalleParamsSchema, request.params);
    const orden = await produccionService.eliminarDetalle(params.id, params.detalleId);

    responderExito(response, orden);
  },

  async actualizarEstado(request: Request, response: Response) {
    const params = validar(ordenProduccionParamsSchema, request.params);
    const body = validar(actualizarEstadoProduccionSchema, request.body);
    const orden = await produccionService.actualizarEstado(params.id, body);

    responderExito(response, orden);
  },

  async iniciar(request: Request, response: Response) {
    const params = validar(ordenProduccionParamsSchema, request.params);
    const body = validar(accionProduccionSchema, request.body ?? {});
    const orden = await produccionService.iniciar(params.id, body.idUsuario);

    responderExito(response, orden);
  },

  async finalizar(request: Request, response: Response) {
    const params = validar(ordenProduccionParamsSchema, request.params);
    const body = validar(accionProduccionSchema, request.body ?? {});
    const orden = await produccionService.finalizar(params.id, body.idUsuario);

    responderExito(response, orden);
  }
};
