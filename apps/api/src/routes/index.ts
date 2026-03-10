import { Router } from "express";

import { asyncHandler } from "../compartido/http/async-handler";
import {
  cargarAutenticacionOpcional,
  requerirAutenticacion
} from "../compartido/middlewares/requerir-autenticacion.middleware";
import { autenticacionRouter } from "../modulos/autenticacion/autenticacion.routes";
import { healthRouter } from "./health.routes";
import { categoriasRouter } from "../modulos/categorias/categorias.routes";
import { clientesRouter } from "../modulos/clientes/clientes.routes";
import { itemsCatalogoRouter } from "../modulos/items-catalogo/items-catalogo.routes";
import { pedidosRouter } from "../modulos/pedidos/pedidos.routes";
import { produccionRouter } from "../modulos/produccion/produccion.routes";
import { solicitudesEspecialesRouter } from "../modulos/solicitudes-especiales/solicitudes-especiales.routes";
import { stockRouter } from "../modulos/stock/stock.routes";
import { usuariosController } from "../modulos/usuarios/usuarios.controller";
import { usuariosRouter } from "../modulos/usuarios/usuarios.routes";

export const apiRouter = Router();
const rutasPrivadasRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/autenticacion", autenticacionRouter);
apiRouter.post("/usuarios", cargarAutenticacionOpcional, asyncHandler(usuariosController.crear));

rutasPrivadasRouter.use(requerirAutenticacion);
rutasPrivadasRouter.use("/usuarios", usuariosRouter);
rutasPrivadasRouter.use("/categorias", categoriasRouter);
rutasPrivadasRouter.use("/items-catalogo", itemsCatalogoRouter);
rutasPrivadasRouter.use("/clientes", clientesRouter);
rutasPrivadasRouter.use("/stock", stockRouter);
rutasPrivadasRouter.use("/pedidos", pedidosRouter);
rutasPrivadasRouter.use("/produccion", produccionRouter);
rutasPrivadasRouter.use("/solicitudes-especiales", solicitudesEspecialesRouter);

apiRouter.use(rutasPrivadasRouter);
