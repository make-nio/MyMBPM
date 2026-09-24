import { NextFunction, Request, Response } from "express";

// Encabezados de las respuestas de la API. Los del sitio (CSP, HSTS...) los publica Netlify desde
// apps/web/out/_headers; estos van en la function por si esas reglas no alcanzan a las respuestas
// de /api/*. Las respuestas tienen datos de clientes y costos: ningun cache las guarda.
export function encabezadosSeguridadMiddleware(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Cache-Control", "no-store");
  response.removeHeader("X-Powered-By");
  next();
}
