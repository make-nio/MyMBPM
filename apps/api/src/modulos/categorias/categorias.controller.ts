import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarCategoriaSchema,
  actualizarEstadoCategoriaSchema,
  categoriaParamsSchema,
  crearCategoriaSchema,
  listarCategoriasQuerySchema
} from "./categorias.schemas";
import { categoriasService } from "./categorias.service";

export const categoriasController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarCategoriasQuerySchema, request.query);
    const categorias = await categoriasService.listar(query);

    responderExito(response, categorias);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(categoriaParamsSchema, request.params);
    const categoria = await categoriasService.obtenerPorId(params.id);

    responderExito(response, categoria);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearCategoriaSchema, request.body);
    const categoria = await categoriasService.crear(body);

    responderExito(response, categoria, 201);
  },

  async actualizar(request: Request, response: Response) {
    const params = validar(categoriaParamsSchema, request.params);
    const body = validar(actualizarCategoriaSchema, request.body);
    const categoria = await categoriasService.actualizar(params.id, body);

    responderExito(response, categoria);
  },

  async cambiarEstado(request: Request, response: Response) {
    const params = validar(categoriaParamsSchema, request.params);
    const body = validar(actualizarEstadoCategoriaSchema, request.body);
    const categoria = await categoriasService.cambiarEstado(params.id, body.activo);

    responderExito(response, categoria);
  }
};
