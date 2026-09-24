import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { busquedaController } from "./busqueda.controller";

export const busquedaRouter = Router();

busquedaRouter.get("/", asyncHandler(busquedaController.buscar));
