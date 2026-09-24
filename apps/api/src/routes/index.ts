import { Router } from "express";

import { asyncHandler } from "../compartido/http/async-handler";
import { ocultarCostosSinPermiso } from "../compartido/middlewares/costos-solo-con-permiso.middleware";
import {
  cargarAutenticacionOpcional,
  requerirAutenticacion
} from "../compartido/middlewares/requerir-autenticacion.middleware";
import { auditoriaRouter } from "../modulos/auditoria/auditoria.routes";
import { autenticacionRouter } from "../modulos/autenticacion/autenticacion.routes";
import { busquedaRouter } from "../modulos/busqueda/busqueda.routes";
import { healthRouter } from "./health.routes";
import { categoriasRouter } from "../modulos/categorias/categorias.routes";
import { clientesRouter } from "../modulos/clientes/clientes.routes";
import { importacionCatalogoRouter } from "../modulos/importacion-catalogo/importacion-catalogo.routes";
import { importacionClientesRouter } from "../modulos/importacion-clientes/importacion-clientes.routes";
import { itemsCatalogoRouter } from "../modulos/items-catalogo/items-catalogo.routes";
import { panelRouter } from "../modulos/panel/panel.routes";
import { pedidosRouter } from "../modulos/pedidos/pedidos.routes";
import { produccionRouter } from "../modulos/produccion/produccion.routes";
import { reportesRouter } from "../modulos/reportes/reportes.routes";
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
rutasPrivadasRouter.use(ocultarCostosSinPermiso);
rutasPrivadasRouter.use("/usuarios", usuariosRouter);
rutasPrivadasRouter.use("/categorias", categoriasRouter);
rutasPrivadasRouter.use("/items-catalogo/importacion", importacionCatalogoRouter);
rutasPrivadasRouter.use("/items-catalogo", itemsCatalogoRouter);
rutasPrivadasRouter.use("/clientes/importacion", importacionClientesRouter);
rutasPrivadasRouter.use("/clientes", clientesRouter);
rutasPrivadasRouter.use("/stock", stockRouter);
rutasPrivadasRouter.use("/panel", panelRouter);
rutasPrivadasRouter.use("/pedidos", pedidosRouter);
rutasPrivadasRouter.use("/produccion", produccionRouter);
rutasPrivadasRouter.use("/solicitudes-especiales", solicitudesEspecialesRouter);
rutasPrivadasRouter.use("/auditoria", auditoriaRouter);
rutasPrivadasRouter.use("/reportes", reportesRouter);
rutasPrivadasRouter.use("/busqueda", busquedaRouter);

apiRouter.use(rutasPrivadasRouter);
