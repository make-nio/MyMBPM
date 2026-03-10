import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAutenticacion } from "../../compartido/middlewares/requerir-autenticacion.middleware";

import { autenticacionController } from "./autenticacion.controller";

export const autenticacionRouter = Router();

autenticacionRouter.post("/login", asyncHandler(autenticacionController.login));
autenticacionRouter.get("/me", requerirAutenticacion, asyncHandler(autenticacionController.me));
