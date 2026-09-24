import { existsSync } from "node:fs";
import { isAbsolute, relative } from "node:path";

import MCR, { type CoverageReportOptions } from "monocart-coverage-reports";

import { URL_WEB } from "./entorno";

const ARCHIVOS_PROPIOS = /^(app\/|src\/(components|lib|hooks)\/).*\.tsx?$/;

// Rutas relativas a apps/web. Exige que el archivo exista: Next.js mapea parte de sus
// internos con rutas que parecen propias (por ejemplo src/lib/metadata/*).
function esArchivoPropio(ruta: string) {
  const relativa = isAbsolute(ruta) ? relative(process.cwd(), ruta) : ruta;
  return ARCHIVOS_PROPIOS.test(relativa) && !relativa.includes("/types/") && existsSync(relativa);
}

// Cobertura del front medida desde el navegador (V8) y mapeada a los fuentes con los
// source maps del build (productionBrowserSourceMaps cuando E2E_COVERAGE=1).
export const opcionesCobertura: CoverageReportOptions = {
  name: "Cobertura E2E web",
  outputDir: "./coverage/e2e",
  reports: ["json", "json-summary", "text-summary"],
  entryFilter: (entry) => entry.url.startsWith(`${URL_WEB}/_next/static/chunks/`),
  // Next.js mapea sus fuentes internos como "_N_E/src/client/..."; solo cuenta el codigo propio.
  sourcePath: (sourcePath) => sourcePath.replace(/^_N_E\//, ""),
  sourceFilter: esArchivoPropio,
  // Los archivos que ninguna prueba carga cuentan como 0 %, en vez de no aparecer.
  all: {
    dir: ["./app", "./src"],
    filter: esArchivoPropio
  },
  cleanCache: false
};

export function crearReporteCobertura() {
  return MCR(opcionesCobertura);
}
