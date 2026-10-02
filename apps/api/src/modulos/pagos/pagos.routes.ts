import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { pagosController } from "./pagos.controller";

// Se monta en /api/pedidos (los pagos cuelgan de un pedido): registra sus rutas en ese router
// para que la lista de rutas del contrato las vea con su camino completo.
export function registrarRutasPagos(pedidosRouter: Router) {
  pedidosRouter.get("/:id/pagos", asyncHandler(pagosController.listar));
  pedidosRouter.post("/:id/pagos", asyncHandler(pagosController.registrar));
  // Anular un pago: solo administradores.
  pedidosRouter.post("/:id/pagos/:pagoId/anular", requerirAdministrador, asyncHandler(pagosController.anular));
}
