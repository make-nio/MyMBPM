import { Router } from "express";

import { healthRouter } from "./health.routes";
import { categoriasRouter } from "../modulos/categorias/categorias.routes";
import { clientesRouter } from "../modulos/clientes/clientes.routes";
import { itemsCatalogoRouter } from "../modulos/items-catalogo/items-catalogo.routes";
import { pedidosRouter } from "../modulos/pedidos/pedidos.routes";
import { produccionRouter } from "../modulos/produccion/produccion.routes";
import { stockRouter } from "../modulos/stock/stock.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/categorias", categoriasRouter);
apiRouter.use("/items-catalogo", itemsCatalogoRouter);
apiRouter.use("/clientes", clientesRouter);
apiRouter.use("/stock", stockRouter);
apiRouter.use("/pedidos", pedidosRouter);
apiRouter.use("/produccion", produccionRouter);
