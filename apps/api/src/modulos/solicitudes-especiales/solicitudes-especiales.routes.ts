import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { solicitudesEspecialesController } from "./solicitudes-especiales.controller";

export const solicitudesEspecialesRouter = Router();

solicitudesEspecialesRouter.get("/", asyncHandler(solicitudesEspecialesController.listar));
solicitudesEspecialesRouter.get("/:id", asyncHandler(solicitudesEspecialesController.obtenerPorId));
solicitudesEspecialesRouter.post("/", asyncHandler(solicitudesEspecialesController.crear));
solicitudesEspecialesRouter.patch("/:id", asyncHandler(solicitudesEspecialesController.actualizar));
solicitudesEspecialesRouter.patch(
  "/:id/estado",
  asyncHandler(solicitudesEspecialesController.cambiarEstado)
);
