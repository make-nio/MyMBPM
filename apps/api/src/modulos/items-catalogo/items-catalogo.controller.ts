import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarItemCatalogoSchema,
  actualizarEstadoItemCatalogoSchema,
  actualizarComponenteItemCatalogoSchema,
  crearComponenteItemCatalogoSchema,
  crearImagenAdicionalSchema,
  crearItemCatalogoSchema,
  itemCatalogoComponenteParamsSchema,
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
  },

  async listarComponentes(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const componentes = await itemsCatalogoService.listarComponentes(params.id);

    responderExito(response, componentes);
  },

  async agregarComponente(request: Request, response: Response) {
    const params = validar(itemCatalogoParamsSchema, request.params);
    const body = validar(crearComponenteItemCatalogoSchema, request.body);
    const componente = await itemsCatalogoService.agregarComponente(params.id, body);

    responderExito(response, componente, 201);
  },

  async actualizarComponente(request: Request, response: Response) {
    const params = validar(itemCatalogoComponenteParamsSchema, request.params);
    const body = validar(actualizarComponenteItemCatalogoSchema, request.body);
    const componente = await itemsCatalogoService.actualizarComponente(
      params.id,
      params.componenteId,
      body
    );

    responderExito(response, componente);
  },

  async eliminarComponente(request: Request, response: Response) {
    const params = validar(itemCatalogoComponenteParamsSchema, request.params);
    await itemsCatalogoService.eliminarComponente(params.id, params.componenteId);

    responderExito(response, { eliminado: true });
  }
};
