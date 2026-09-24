import { Endpoint, fecha, objeto, z } from "../base";

// GET /api/health responde sin envoltorio: 200 si la base responde, 503 si no (salud.controller.ts).
const saludOk = objeto({
  status: z.literal("ok"),
  timestamp: fecha,
  base: objeto({
    estado: z.literal("ok"),
    latenciaMs: z.number().int().nonnegative(),
    // null si la tabla de migraciones de Prisma esta vacia.
    ultimaMigracion: z.string().nullable()
  })
});

const saludError = objeto({
  status: z.literal("error"),
  timestamp: fecha,
  base: objeto({
    estado: z.literal("error"),
    motivo: z.string(),
    latenciaMs: z.null(),
    ultimaMigracion: z.null()
  })
});

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/health",
    resumen: "Estado de la API y de la base (200 si responde, 503 si no)",
    etiqueta: "salud",
    publico: true,
    sinEnvoltorio: true,
    respuesta: z.union([saludOk, saludError])
  }
] as const satisfies readonly Endpoint[];
