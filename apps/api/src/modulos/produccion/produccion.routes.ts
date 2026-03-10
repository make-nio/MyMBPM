import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { produccionController } from "./produccion.controller";

export const produccionRouter = Router();

produccionRouter.get("/", asyncHandler(produccionController.listar));
produccionRouter.get("/:id", asyncHandler(produccionController.obtenerPorId));
produccionRouter.post("/", asyncHandler(produccionController.crear));
produccionRouter.post("/:id/detalles", asyncHandler(produccionController.agregarDetalle));
produccionRouter.patch(
  "/:id/detalles/:detalleId",
  asyncHandler(produccionController.actualizarDetalle)
);
produccionRouter.delete(
  "/:id/detalles/:detalleId",
  asyncHandler(produccionController.eliminarDetalle)
);
produccionRouter.patch("/:id/estado", asyncHandler(produccionController.actualizarEstado));
produccionRouter.post("/:id/iniciar", asyncHandler(produccionController.iniciar));
produccionRouter.post("/:id/finalizar", asyncHandler(produccionController.finalizar));
