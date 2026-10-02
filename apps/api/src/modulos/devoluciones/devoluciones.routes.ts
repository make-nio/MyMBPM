import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";

import { devolucionesController } from "./devoluciones.controller";

// Se monta en /api/pedidos (una devolucion cuelga de un pedido), como los pagos.
export function registrarRutasDevoluciones(pedidosRouter: Router) {
  pedidosRouter.get("/:id/devoluciones", asyncHandler(devolucionesController.listar));
  pedidosRouter.post("/:id/devoluciones", asyncHandler(devolucionesController.registrar));
}
