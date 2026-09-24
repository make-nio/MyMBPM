import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { importacionCatalogoController } from "./importacion-catalogo.controller";

export const importacionCatalogoRouter = Router();

// Solo administradores (el archivo trae costos). El limite del cuerpo (2 MB) se fija en app.ts.
importacionCatalogoRouter.post("/previsualizar", requerirAdministrador, asyncHandler(importacionCatalogoController.previsualizar));
importacionCatalogoRouter.post("/", requerirAdministrador, asyncHandler(importacionCatalogoController.importar));
