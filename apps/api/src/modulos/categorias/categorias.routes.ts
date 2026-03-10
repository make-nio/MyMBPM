import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { categoriasController } from "./categorias.controller";

export const categoriasRouter = Router();

categoriasRouter.get("/", asyncHandler(categoriasController.listar));
categoriasRouter.get("/:id", asyncHandler(categoriasController.obtenerPorId));
categoriasRouter.post("/", asyncHandler(categoriasController.crear));
categoriasRouter.patch("/:id", asyncHandler(categoriasController.actualizar));
categoriasRouter.patch("/:id/estado", asyncHandler(categoriasController.cambiarEstado));

