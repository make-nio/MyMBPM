import { Request, Response } from "express";

import { registrarErrorInterno } from "../../compartido/middlewares/manejo-errores.middleware";

import { saludService } from "./salud.service";

// GET /api/health, publico: para un monitor externo y para esperar a la API en los E2E.
// 200 si la base responde, 503 si no (el monitor alerta por el codigo, sin leer el cuerpo).
export async function saludController(request: Request, response: Response) {
  const base = await saludService.revisarBase();

  if (base.estado === "error") {
    registrarErrorInterno(request, base.causa);
    response.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      base: { estado: "error", motivo: base.motivo, latenciaMs: null, ultimaMigracion: null }
    });
    return;
  }

  response.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    base: { estado: "ok", latenciaMs: base.latenciaMs, ultimaMigracion: base.ultimaMigracion }
  });
}
