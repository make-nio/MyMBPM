import { URL_WEB } from "./entorno";
import { expect, test } from "./fixtures";

// /api/health es publico (lo consulta un monitor externo): dice si la base responde, en cuanto
// tiempo y que migracion tiene aplicada, sin datos de conexion.
test("/api/health informa la base sin exponer datos de conexion", async () => {
  const respuesta = await fetch(`${URL_WEB}/api/health`);
  const cuerpo = (await respuesta.json()) as {
    status: string;
    timestamp: string;
    base: { estado: string; latenciaMs: number; ultimaMigracion: string };
  };

  expect(respuesta.status).toBe(200);
  expect(respuesta.headers.get("cache-control")).toBe("no-store");
  expect(cuerpo.status).toBe("ok");
  expect(Number.isNaN(Date.parse(cuerpo.timestamp))).toBe(false);
  expect(cuerpo.base.estado).toBe("ok");
  expect(cuerpo.base.latenciaMs).toBeGreaterThanOrEqual(0);
  expect(cuerpo.base.latenciaMs).toBeLessThan(5000);
  expect(cuerpo.base.ultimaMigracion).toMatch(/^\d{14}_[a-z0-9_]+$/);

  const texto = JSON.stringify(cuerpo);
  expect(texto).not.toMatch(/postgres|localhost|5432|password|neon/i);
});
