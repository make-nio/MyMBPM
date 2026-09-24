// Combina la cobertura de pruebas unitarias y E2E y publica un resumen.
//
// Backend (apps/api): vitest (unit) + la API corriendo durante Playwright (c8 sobre NODE_V8_COVERAGE).
// Front (apps/web):   Playwright (V8 del navegador, monocart) + vitest de src/lib.
//
// Las herramientas no definen igual las "lineas ejecutables" (vitest ignora lineas vacias y
// comentarios, c8 no), asi que no se pueden mezclar los mapas de istanbul tal cual. Se combina
// por linea: cada archivo toma como base las lineas ejecutables de su fuente principal, y una
// linea cuenta como cubierta si alguna de las dos fuentes la ejecuto. La metrica es % de lineas.
//
// Uso: node scripts/reporte-cobertura.mjs
//   COBERTURA_UMBRAL (default 50) y COBERTURA_ESTRICTA=1 para fallar si no se alcanza.
//   Si existe GITHUB_STEP_SUMMARY, agrega la tabla al resumen del job.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import libCoverage from "istanbul-lib-coverage";

const raiz = resolve(new URL("..", import.meta.url).pathname);
const umbral = Number(process.env.COBERTURA_UMBRAL ?? 50);
const estricta = process.env.COBERTURA_ESTRICTA === "1";

function leerLineas(archivo, baseRutas) {
  const ruta = join(raiz, archivo);

  if (!existsSync(ruta)) {
    return null;
  }

  const mapa = libCoverage.createCoverageMap(JSON.parse(readFileSync(ruta, "utf8")));
  const lineas = new Map();

  for (const archivoFuente of mapa.files()) {
    const absoluta = isAbsolute(archivoFuente) ? archivoFuente : join(raiz, baseRutas, archivoFuente);
    lineas.set(relative(raiz, absoluta), mapa.fileCoverageFor(archivoFuente).getLineCoverage());
  }

  return lineas;
}

function combinar(principal, secundaria) {
  let total = 0;
  let cubiertas = 0;
  let cubiertasSoloPrincipal = 0;

  for (const [archivo, lineas] of principal ?? []) {
    const otras = secundaria?.get(archivo) ?? {};

    for (const [linea, hits] of Object.entries(lineas)) {
      total += 1;
      cubiertasSoloPrincipal += hits > 0 ? 1 : 0;
      cubiertas += hits > 0 || (otras[linea] ?? 0) > 0 ? 1 : 0;
    }
  }

  return { total, cubiertas, cubiertasSoloPrincipal };
}

function porcentaje(parte, total) {
  return total === 0 ? 0 : Math.round((parte / total) * 1000) / 10;
}

const areas = [
  {
    nombre: "Backend (apps/api)",
    principal: { etiqueta: "unit (vitest)", datos: leerLineas("apps/api/coverage/unit/coverage-final.json", "apps/api") },
    secundaria: { etiqueta: "E2E (API en Playwright)", datos: leerLineas("apps/api/coverage/e2e/coverage-final.json", "apps/api") }
  },
  {
    nombre: "Front (apps/web)",
    principal: { etiqueta: "E2E (Playwright)", datos: leerLineas("apps/web/coverage/e2e/coverage-final.json", "apps/web") },
    secundaria: { etiqueta: "unit (vitest src/lib)", datos: leerLineas("apps/web/coverage/unit/coverage-final.json", "apps/web") }
  }
];

const filas = [];
let bajoUmbral = false;

for (const area of areas) {
  if (!area.principal.datos) {
    filas.push(`| ${area.nombre} | sin datos (${area.principal.etiqueta}) | – | – | ⚠️ |`);
    bajoUmbral = true;
    continue;
  }

  const soloSecundaria = combinar(area.secundaria.datos, null);
  const { total, cubiertas, cubiertasSoloPrincipal } = combinar(area.principal.datos, area.secundaria.datos);
  const combinado = porcentaje(cubiertas, total);
  const cumple = combinado >= umbral;
  bajoUmbral ||= !cumple;

  filas.push(
    `| ${area.nombre} | ${porcentaje(cubiertasSoloPrincipal, total)} % | ` +
      `${area.secundaria.datos ? `${porcentaje(soloSecundaria.cubiertas, soloSecundaria.total)} %` : "sin datos"} | ` +
      `**${combinado} %** (${cubiertas}/${total}) | ${cumple ? "✅" : "❌"} |`
  );
}

const modo = estricta ? "bloqueante" : "informativo";
const tabla = [
  `### Cobertura de lineas (umbral ${umbral} %, ${modo})`,
  "",
  "| Area | Fuente principal | Fuente secundaria | Combinada | Umbral |",
  "| --- | --- | --- | --- | --- |",
  ...filas,
  "",
  "Backend: principal = vitest, secundaria = API durante los E2E. " +
    "Front: principal = Playwright, secundaria = vitest de `src/lib`. " +
    "La combinada cuenta una linea como cubierta si la ejecuto cualquiera de las dos.",
  ""
].join("\n");

console.log(tabla);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tabla}\n`);
}

if (bajoUmbral) {
  const mensaje = `La cobertura combinada no alcanza el ${umbral} % en al menos un area.`;

  if (estricta) {
    console.error(mensaje);
    process.exit(1);
  }

  console.warn(`${mensaje} (modo informativo: no falla el job)`);
}
