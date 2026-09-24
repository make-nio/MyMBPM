import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { importacionClientesController } from "./importacion-clientes.controller";

export const importacionClientesRouter = Router();

// Solo administradores, como la importacion del catalogo. El limite del cuerpo (2 MB) se fija en app.ts.
importacionClientesRouter.post("/previsualizar", requerirAdministrador, asyncHandler(importacionClientesController.previsualizar));
importacionClientesRouter.post("/", requerirAdministrador, asyncHandler(importacionClientesController.importar));
