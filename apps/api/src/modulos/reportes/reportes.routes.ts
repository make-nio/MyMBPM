import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { reportesController } from "./reportes.controller";

export const reportesRouter = Router();

// Vendido, costo y ganancia: solo administradores (mismo criterio que puedeVerCostos).
reportesRouter.get("/ventas-mes", requerirAdministrador, asyncHandler(reportesController.ventasDelMes));
reportesRouter.get("/ventas-por-mes", requerirAdministrador, asyncHandler(reportesController.ventasPorMes));
// Lo cobrado en el mes por medio de pago (#90).
reportesRouter.get("/cobros-mes", requerirAdministrador, asyncHandler(reportesController.cobrosDelMes));
