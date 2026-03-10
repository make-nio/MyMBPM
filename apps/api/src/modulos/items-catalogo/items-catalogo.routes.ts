import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { itemsCatalogoController } from "./items-catalogo.controller";

export const itemsCatalogoRouter = Router();

itemsCatalogoRouter.get("/", asyncHandler(itemsCatalogoController.listar));
itemsCatalogoRouter.get("/:id", asyncHandler(itemsCatalogoController.obtenerPorId));
itemsCatalogoRouter.post("/", asyncHandler(itemsCatalogoController.crear));
itemsCatalogoRouter.patch("/:id", asyncHandler(itemsCatalogoController.actualizar));
itemsCatalogoRouter.patch("/:id/estado", asyncHandler(itemsCatalogoController.cambiarEstado));
itemsCatalogoRouter.get("/:id/componentes", asyncHandler(itemsCatalogoController.listarComponentes));
itemsCatalogoRouter.post("/:id/componentes", asyncHandler(itemsCatalogoController.agregarComponente));
itemsCatalogoRouter.patch(
  "/:id/componentes/:componenteId",
  asyncHandler(itemsCatalogoController.actualizarComponente)
);
itemsCatalogoRouter.delete(
  "/:id/componentes/:componenteId",
  asyncHandler(itemsCatalogoController.eliminarComponente)
);
itemsCatalogoRouter.post("/:id/imagenes", asyncHandler(itemsCatalogoController.agregarImagen));
itemsCatalogoRouter.delete(
  "/:id/imagenes/:imagenId",
  asyncHandler(itemsCatalogoController.eliminarImagen)
);
