import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { saludController } from "./salud.controller";

export const saludRouter = Router();

saludRouter.get("/", asyncHandler(saludController));
