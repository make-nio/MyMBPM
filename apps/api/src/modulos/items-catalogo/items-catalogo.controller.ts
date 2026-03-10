import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarItemCatalogoSchema,
  actualizarEstadoItemCatalogoSchema,
  crearImagenAdicionalSchema,
  crearItemCatalogoSchema,
  itemCatalogoImagenParamsSchema,
  itemCatalogoParamsSchema,
  listarItemsCatalogoQuerySchema
} from "./items-catalogo.schemas";
import { itemsCatalogoService } from "./items-catalogo.service";

export const itemsCatalogoController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarItemsCatalogoQuerySchema, request.query);
    const items = await itemsCatalogoService.listar(query);

    responderExito(response, items);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const item = await itemsCatalogoService.obtenerPorId(params.id);

    responderExito(response, item);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearItemCatalogoSchema, request.body);
    const item = await itemsCatalogoService.crear(body);

    responderExito(response, item, 201);
  },

  async actualizar(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const body = validar(actualizarItemCatalogoSchema, request.body);
    const item = await itemsCatalogoService.actualizar(params.id, body);

    responderExito(response, item);
  },

  async cambiarEstado(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const body = validar(actualizarEstadoItemCatalogoSchema, request.body);
    const item = await itemsCatalogoService.cambiarEstado(params.id, body.activo);

    responderExito(response, item);
  },

  async agregarImagen(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const body = validar(crearImagenAdicionalSchema, request.body);
    const imagen = await itemsCatalogoService.agregarImagen(params.id, body);

    responderExito(response, imagen, 201);
  },

  async eliminarImagen(request: Request, response: Response) {
    const params = validar(itemCatalogoImagenParamsSchema, request.params);
    await itemsCatalogoService.eliminarImagen(params.id, params.imagenId);

    responderExito(response, { eliminado: true });
  }
};
