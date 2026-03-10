import { Request, Response } from "express";

import { responderExito } from "../../compartido/http/respuesta";
import { validar } from "../../compartido/validaciones/validar";
import { prisma } from "../../lib/prisma";

import {
  crearAjusteStockSchema,
  historialStockQuerySchema,
  stockActualQuerySchema
} from "./stock.schemas";
import { stockService } from "./stock.service";

export const stockController = {
  async obtenerStockActual(request: Request, response: Response) {
    const query = validar(stockActualQuerySchema, request.query);
    const stock = await stockService.obtenerStockActual(prisma, query.idItemCatalogo, query.tipoStock);

    responderExito(response, stock);
  },

  async obtenerHistorial(request: Request, response: Response) {
    const query = validar(historialStockQuerySchema, request.query);
    const historial = await stockService.obtenerHistorial(prisma, query);

    responderExito(response, historial);
  },

  async crearAjuste(request: Request, response: Response) {
    const body = validar(crearAjusteStockSchema, request.body);
    const movimiento = await stockService.registrarAjusteManual(prisma, body);

    responderExito(response, movimiento, 201);
  }
};
