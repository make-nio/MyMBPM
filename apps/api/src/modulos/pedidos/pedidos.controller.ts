import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarEstadoPedidoSchema,
  actualizarDetallePedidoSchema,
  agregarDetallePedidoSchema,
  crearPedidoSchema,
  listarPedidosQuerySchema,
  pedidoDetalleParamsSchema,
  pedidoParamsSchema
} from "./pedidos.schemas";
import { pedidosService } from "./pedidos.service";

export const pedidosController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarPedidosQuerySchema, request.query);
    const pedidos = await pedidosService.listar(query);

    responderExito(response, pedidos);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(pedidoParamsSchema, request.params);
    const pedido = await pedidosService.obtenerPorId(params.id);

    responderExito(response, pedido);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearPedidoSchema, request.body);
    const pedido = await pedidosService.crear(body);

    responderExito(response, pedido, 201);
  },

  async agregarDetalle(request: Request, response: Response) {
    const params = validar(pedidoParamsSchema, request.params);
    const body = validar(agregarDetallePedidoSchema, request.body);
    const pedido = await pedidosService.agregarDetalle(params.id, body);

    responderExito(response, pedido, 201);
  },

  async actualizarDetalle(request: Request, response: Response) {
    const params = validar(pedidoDetalleParamsSchema, request.params);
    const body = validar(actualizarDetallePedidoSchema, request.body);
    const pedido = await pedidosService.actualizarDetalle(params.id, params.detalleId, body);

    responderExito(response, pedido);
  },

  async eliminarDetalle(request: Request, response: Response) {
    const params = validar(pedidoDetalleParamsSchema, request.params);
    const pedido = await pedidosService.eliminarDetalle(params.id, params.detalleId);

    responderExito(response, pedido);
  },

  async actualizarEstado(request: Request, response: Response) {
    const params = validar(pedidoParamsSchema, request.params);
    const body = validar(actualizarEstadoPedidoSchema, request.body);
    const pedido = await pedidosService.actualizarEstado(params.id, body);

    responderExito(response, pedido);
  },

  async confirmar(request: Request, response: Response) {
    const params = validar(pedidoParamsSchema, request.params);
    // Los egresos de stock quedan a nombre del usuario de la sesion. Antes se tomaba un
    // idUsuario del body, que cualquier cliente podia falsear u omitir.
    const pedido = await pedidosService.confirmar(params.id, request.usuarioAutenticado?.idUsuario);

    responderExito(response, pedido);
  }
};
