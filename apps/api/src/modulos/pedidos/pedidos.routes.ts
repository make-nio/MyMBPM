import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { pedidosController } from "./pedidos.controller";

export const pedidosRouter = Router();

pedidosRouter.get("/", asyncHandler(pedidosController.listar));
pedidosRouter.get("/:id", asyncHandler(pedidosController.obtenerPorId));
pedidosRouter.post("/", asyncHandler(pedidosController.crear));
pedidosRouter.post("/:id/detalles", asyncHandler(pedidosController.agregarDetalle));
pedidosRouter.patch("/:id/estado", asyncHandler(pedidosController.actualizarEstado));
pedidosRouter.post("/:id/confirmar", asyncHandler(pedidosController.confirmar));
