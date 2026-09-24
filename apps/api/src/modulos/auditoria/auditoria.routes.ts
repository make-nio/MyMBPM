import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { auditoriaController } from "./auditoria.controller";

export const auditoriaRouter = Router();

// El historial de cambios (precios, costos, datos de clientes) lo ven solo los administradores.
auditoriaRouter.get("/", requerirAdministrador, asyncHandler(auditoriaController.listar));
