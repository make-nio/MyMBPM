import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { stockController } from "./stock.controller";

export const stockRouter = Router();

stockRouter.get("/actual", asyncHandler(stockController.obtenerStockActual));
stockRouter.get("/historial", asyncHandler(stockController.obtenerHistorial));
stockRouter.post("/ajustes", asyncHandler(stockController.crearAjuste));
