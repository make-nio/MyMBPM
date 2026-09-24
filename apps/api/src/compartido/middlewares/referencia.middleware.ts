import { randomBytes } from "node:crypto";

import { NextFunction, Request, Response } from "express";

// "3F9A-12BC": corto para dictarlo por WhatsApp. Se llama referencia y no "id de pedido" para no
// confundirlo con los pedidos de clientes.
export function generarReferencia() {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

// Primer middleware: cada solicitud lleva su referencia en request y en el header X-Referencia.
export function referenciaMiddleware(request: Request, response: Response, next: NextFunction) {
  request.referencia = generarReferencia();
  response.setHeader("X-Referencia", request.referencia);
  next();
}
