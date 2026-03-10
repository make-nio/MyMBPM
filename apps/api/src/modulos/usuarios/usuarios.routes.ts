import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { usuariosController } from "./usuarios.controller";

export const usuariosRouter = Router();

usuariosRouter.get("/", asyncHandler(usuariosController.listar));
usuariosRouter.get("/:id", asyncHandler(usuariosController.obtenerPorId));
usuariosRouter.patch("/:id", asyncHandler(usuariosController.actualizar));
usuariosRouter.patch("/:id/estado", asyncHandler(usuariosController.cambiarEstado));
usuariosRouter.patch("/:id/clave", asyncHandler(usuariosController.cambiarClave));
