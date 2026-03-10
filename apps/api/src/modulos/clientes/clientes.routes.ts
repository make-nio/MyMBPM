import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { clientesController } from "./clientes.controller";

export const clientesRouter = Router();

clientesRouter.get("/", asyncHandler(clientesController.listar));
clientesRouter.get("/:id", asyncHandler(clientesController.obtenerPorId));
clientesRouter.post("/", asyncHandler(clientesController.crear));
clientesRouter.patch("/:id", asyncHandler(clientesController.actualizar));
clientesRouter.patch("/:id/estado", asyncHandler(clientesController.cambiarEstado));
