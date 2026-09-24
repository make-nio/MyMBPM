import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, expect, test, type BrowserContext } from "@playwright/test";

import { ARCHIVO_SESION_ADMIN, URL_WEB } from "./entorno";

// Presupuesto de rendimiento: Lighthouse (perfil movil, throttling simulado) sobre las
// pantallas mas usadas. Corre aparte de los E2E (npm run test:rendimiento), contra el mismo
// export estatico y la misma API que levanta playwright.config.ts.
//
// Por pagina se mide PASADAS veces y se toma la mediana. El presupuesto tiene dos partes:
//   - puntaje de rendimiento minimo: lo medido en el CI al crear la prueba menos un margen,
//     porque el puntaje varia entre corridas del runner;
//   - JavaScript descargado maximo (KB, sin comprimir: el servidor de prueba no usa gzip, Netlify
//     si): casi deterministico, detecta un paquete que se cuela en el bundle aunque el puntaje
//     todavia no lo refleje.
// Si un cambio mejora o empeora a proposito estos numeros, actualiza PRESUPUESTO y explicalo
// en el PR (docs/rendimiento.md).

type Presupuesto = { ruta: string; nombre: string; conSesion: boolean; puntajeMinimo: number; jsMaximoKb: number };

const PRESUPUESTO: Presupuesto[] = [
  { ruta: "/ingresar", nombre: "Ingreso", conSesion: false, puntajeMinimo: 85, jsMaximoKb: 380 },
  { ruta: "/panel", nombre: "Panel", conSesion: true, puntajeMinimo: 85, jsMaximoKb: 480 },
  { ruta: "/pedidos", nombre: "Pedidos", conSesion: true, puntajeMinimo: 84, jsMaximoKb: 430 }
];

const PASADAS = Number(process.env.RENDIMIENTO_PASADAS || 3);
const PUERTO_DEPURACION = Number(process.env.RENDIMIENTO_PUERTO_DEPURACION || 9322);
const DIRECTORIO_REPORTES = "rendimiento-report";

type Medicion = { puntaje: number; jsKb: number; lcpMs: number; tbtMs: number; cls: number };
type Resultado = Presupuesto & Medicion;

type Auditoria = { numericValue?: number; details?: { items?: Array<{ resourceType?: string; transferSize?: number }> } };
type ResultadoLighthouse = {
  categories: { performance: { score: number | null } };
  audits: Record<string, Auditoria>;
  runtimeError?: { message: string };
};

function mediana(valores: number[]) {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

function leerToken() {
  const sesion = JSON.parse(readFileSync(ARCHIVO_SESION_ADMIN, "utf8")) as {
    origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
  };

  return sesion.origins[0].localStorage[0].value;
}

function medir(lhr: ResultadoLighthouse): Medicion {
  if (lhr.runtimeError) {
    throw new Error(`Lighthouse fallo: ${lhr.runtimeError.message}`);
  }

  const bytesJs = (lhr.audits["network-requests"].details?.items ?? [])
    .filter((item) => item.resourceType === "Script")
    .reduce((total, item) => total + (item.transferSize ?? 0), 0);

  return {
    puntaje: Math.round((lhr.categories.performance.score ?? 0) * 100),
    jsKb: Math.round(bytesJs / 1024),
    lcpMs: Math.round(lhr.audits["largest-contentful-paint"].numericValue ?? 0),
    tbtMs: Math.round(lhr.audits["total-blocking-time"].numericValue ?? 0),
    cls: Math.round((lhr.audits["cumulative-layout-shift"].numericValue ?? 0) * 1000) / 1000
  };
}

function publicarResumen(resultados: Resultado[]) {
  const filas = resultados.map((r) => {
    const cumple = r.puntaje >= r.puntajeMinimo && r.jsKb <= r.jsMaximoKb;
    return (
      `| ${r.nombre} (\`${r.ruta}\`) | **${r.puntaje}** (min. ${r.puntajeMinimo}) | ` +
      `${r.jsKb} KB (max. ${r.jsMaximoKb}) | ${r.lcpMs} ms | ${r.tbtMs} ms | ${r.cls} | ${cumple ? "✅" : "❌"} |`
    );
  });
  const tabla = [
    `### Rendimiento (Lighthouse movil, mediana de ${PASADAS})`,
    "",
    "| Pagina | Puntaje | JS descargado | LCP | TBT | CLS | Presupuesto |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...filas,
    ""
  ].join("\n");

  console.log(tabla);
  writeFileSync(join(DIRECTORIO_REPORTES, "resumen.json"), JSON.stringify(resultados, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tabla}\n`);
  }
}

test.describe.configure({ mode: "serial" });

test("presupuesto de rendimiento de ingreso, panel y pedidos", async () => {
  test.setTimeout(PRESUPUESTO.length * PASADAS * 60_000);

  // Lighthouse abre sus propias pestañas por el puerto de depuracion. Con un perfil
  // persistente, el token guardado en localStorage llega a esas pestañas; disableStorageReset
  // evita que Lighthouse lo borre antes de medir.
  const perfil = mkdtempSync(join(tmpdir(), "mymbpm-lighthouse-"));
  let contexto: BrowserContext | undefined;

  try {
    contexto = await chromium.launchPersistentContext(perfil, {
      executablePath: process.env.PW_CHROMIUM_EXECUTABLE || undefined,
      args: [`--remote-debugging-port=${PUERTO_DEPURACION}`]
    });

    const pagina = contexto.pages()[0] ?? (await contexto.newPage());
    const token = leerToken();

    // Ingreso se mide sin sesion (con sesion redirige al panel); las privadas, con sesion.
    async function prepararSesion(conSesion: boolean) {
      await pagina.goto(`${URL_WEB}/ingresar`);
      await pagina.evaluate(
        ([valor, guardar]) =>
          guardar ? window.localStorage.setItem("mlm_bpm_token", valor) : window.localStorage.removeItem("mlm_bpm_token"),
        [token, conSesion] as const
      );
      await pagina.goto("about:blank");
    }

    const { default: lighthouse } = await import("lighthouse");
    mkdirSync(DIRECTORIO_REPORTES, { recursive: true });
    const resultados: Resultado[] = [];

    for (const presupuesto of PRESUPUESTO) {
      const mediciones: Medicion[] = [];
      await prepararSesion(presupuesto.conSesion);

      for (let pasada = 1; pasada <= PASADAS; pasada += 1) {
        const ejecucion = await lighthouse(
          `${URL_WEB}${presupuesto.ruta}`,
          {
            port: PUERTO_DEPURACION,
            onlyCategories: ["performance"],
            disableStorageReset: true,
            output: "html",
            logLevel: "error"
          }
        );

        if (!ejecucion) {
          throw new Error(`Lighthouse no devolvio resultado para ${presupuesto.ruta}`);
        }

        const lhr = ejecucion.lhr as unknown as ResultadoLighthouse;
        const url = (ejecucion.lhr as { finalDisplayedUrl?: string }).finalDisplayedUrl ?? "";

        // Si la sesion no llego (o sobro), la pagina redirige y se mediria otra cosa.
        expect(new URL(url).pathname.replace(/\/$/, ""), `Lighthouse midio ${url}`).toBe(presupuesto.ruta);

        mediciones.push(medir(lhr));
        writeFileSync(
          join(DIRECTORIO_REPORTES, `${presupuesto.ruta.slice(1)}-${pasada}.html`),
          String(ejecucion.report)
        );
      }

      resultados.push({
        ...presupuesto,
        puntaje: mediana(mediciones.map((m) => m.puntaje)),
        jsKb: mediana(mediciones.map((m) => m.jsKb)),
        lcpMs: mediana(mediciones.map((m) => m.lcpMs)),
        tbtMs: mediana(mediciones.map((m) => m.tbtMs)),
        cls: mediana(mediciones.map((m) => m.cls))
      });
    }

    publicarResumen(resultados);

    for (const resultado of resultados) {
      expect.soft(resultado.puntaje, `Puntaje de ${resultado.ruta}`).toBeGreaterThanOrEqual(resultado.puntajeMinimo);
      expect.soft(resultado.jsKb, `JS descargado de ${resultado.ruta} (KB)`).toBeLessThanOrEqual(resultado.jsMaximoKb);
    }
  } finally {
    await contexto?.close();
    rmSync(perfil, { recursive: true, force: true });
  }
});
