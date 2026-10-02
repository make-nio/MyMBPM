import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { configuracionController } from "./configuracion.controller";

export const configuracionRouter = Router();

// Cualquiera con sesion la lee (la web necesita saber si pregunta al cancelar); solo un
// administrador la cambia.
configuracionRouter.get("/", asyncHandler(configuracionController.obtener));
configuracionRouter.patch("/", requerirAdministrador, asyncHandler(configuracionController.actualizar));
