import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarClienteSchema,
  actualizarEstadoClienteSchema,
  clienteParamsSchema,
  crearClienteSchema,
  listarClientesQuerySchema
} from "./clientes.schemas";
import { clientesService } from "./clientes.service";

export const clientesController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarClientesQuerySchema, request.query);
    const clientes = await clientesService.listar(query);

    responderExito(response, clientes);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(clienteParamsSchema, request.params);
    const cliente = await clientesService.obtenerPorId(params.id);

    responderExito(response, cliente);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearClienteSchema, request.body);
    const cliente = await clientesService.crear(body);

    responderExito(response, cliente, 201);
  },

  async actualizar(request: Request, response: Response) {
    const params = validar(clienteParamsSchema, request.params);
    const body = validar(actualizarClienteSchema, request.body);
    const cliente = await clientesService.actualizar(params.id, body);

    responderExito(response, cliente);
  },

  async cambiarEstado(request: Request, response: Response) {
    const params = validar(clienteParamsSchema, request.params);
    const body = validar(actualizarEstadoClienteSchema, request.body);
    const cliente = await clientesService.cambiarEstado(params.id, body.activo);

    responderExito(response, cliente);
  }
};
