import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { panelController } from "./panel.controller";

export const panelRouter = Router();

panelRouter.get("/resumen", asyncHandler(panelController.obtenerResumen));
panelRouter.get("/avisos", asyncHandler(panelController.obtenerAvisos));
