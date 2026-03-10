import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";

import {
  actualizarEstadoUsuarioSchema,
  actualizarUsuarioSchema,
  cambiarClaveUsuarioSchema,
  crearUsuarioSchema,
  listarUsuariosQuerySchema,
  usuarioParamsSchema
} from "./usuarios.schemas";
import { usuariosService } from "./usuarios.service";

export const usuariosController = {
  async listar(request: Request, response: Response) {
    const query = validar(listarUsuariosQuerySchema, request.query);
    const usuarios = await usuariosService.listar(query);

    responderExito(response, usuarios);
  },

  async obtenerPorId(request: Request, response: Response) {
    const params = validar(usuarioParamsSchema, request.params);
    const usuario = await usuariosService.obtenerPorId(params.id);

    responderExito(response, usuario);
  },

  async crear(request: Request, response: Response) {
    const body = validar(crearUsuarioSchema, request.body);
    const usuario = await usuariosService.crear(body, request.usuarioAutenticado);

    responderExito(response, usuario, 201);
  },

  async actualizar(request: Request, response: Response) {
    const params = validar(usuarioParamsSchema, request.params);
    const body = validar(actualizarUsuarioSchema, request.body);
    const usuario = await usuariosService.actualizar(params.id, body);

    responderExito(response, usuario);
  },

  async cambiarEstado(request: Request, response: Response) {
    const params = validar(usuarioParamsSchema, request.params);
    const body = validar(actualizarEstadoUsuarioSchema, request.body);
    const usuario = await usuariosService.cambiarEstado(params.id, body.activo);

    responderExito(response, usuario);
  },

  async cambiarClave(request: Request, response: Response) {
    const params = validar(usuarioParamsSchema, request.params);
    const body = validar(cambiarClaveUsuarioSchema, request.body);
    const usuario = await usuariosService.cambiarClave(params.id, body, {
      idUsuario: request.usuarioAutenticado!.idUsuario
    });

    responderExito(response, usuario);
  }
};
