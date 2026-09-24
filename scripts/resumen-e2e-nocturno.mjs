// Resume la corrida nocturna de E2E (la suite completa varias veces, sin reintentos) a partir del
// reporte JSON de Playwright: que pruebas fallaron alguna vez y cuantas de las corridas.
//
// Una prueba que falla en algunas corridas y pasa en otras es intermitente; si falla en todas,
// esta rota. El resumen va al log y, en GitHub Actions, al resumen del job. No abre issues.
//
// Uso: node scripts/resumen-e2e-nocturno.mjs <reporte.json>
//   Sale con codigo 1 si alguna prueba fallo (asi el job queda en rojo).
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FALLAS = new Set(["failed", "timedOut", "interrupted"]);

// Recorre las suites anidadas del reporte y junta, por prueba y proyecto, cuantas veces corrio y
// cuantas fallo. Con --repeat-each cada repeticion es otra entrada de "tests" (y con reintentos,
// otro elemento de "results"): se cuentan todas.
export function contarResultados(reporte) {
  const pruebas = new Map();

  function recorrer(suite, archivo) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const clave = `${test.projectName} › ${spec.file ?? archivo} › ${spec.title}`;
        const actual = pruebas.get(clave) ?? {
          proyecto: test.projectName,
          archivo: spec.file ?? archivo,
          linea: spec.line,
          titulo: spec.title,
          corridas: 0,
          fallas: 0,
          error: null
        };

        for (const resultado of test.results ?? []) {
          if (resultado.status === "skipped") {
            continue;
          }

          actual.corridas += 1;

          if (FALLAS.has(resultado.status)) {
            actual.fallas += 1;
            actual.error ??= primeraLinea(resultado.error?.message ?? resultado.errors?.[0]?.message);
          }
        }

        pruebas.set(clave, actual);
      }
    }

    for (const hija of suite.suites ?? []) {
      recorrer(hija, suite.file ?? archivo);
    }
  }

  for (const suite of reporte.suites ?? []) {
    recorrer(suite, suite.file);
  }

  return [...pruebas.values()];
}

function primeraLinea(mensaje) {
  // Sin los codigos de color de la terminal.
  const limpio = (mensaje ?? "").replace(/\u001b\[[0-9;]*m/g, "").trim();
  return limpio.split("\n")[0].slice(0, 160) || null;
}

export function armarResumen(pruebas, erroresGlobales = []) {
  const falladas = pruebas
    .filter((prueba) => prueba.fallas > 0)
    .sort((a, b) => b.fallas / b.corridas - a.fallas / a.corridas || a.titulo.localeCompare(b.titulo));
  const corridas = pruebas.reduce((total, prueba) => total + prueba.corridas, 0);
  const lineas = ["## E2E nocturno", ""];

  lineas.push(`${pruebas.length} pruebas, ${corridas} ejecuciones, ${falladas.length} con alguna falla.`, "");

  if (erroresGlobales.length > 0) {
    lineas.push("**Errores fuera de las pruebas** (setup, servidores):", "");
    lineas.push(...erroresGlobales.map((error) => `- ${primeraLinea(error.message) ?? "sin mensaje"}`), "");
  }

  if (falladas.length === 0) {
    lineas.push("Todas las pruebas pasaron en todas las corridas.");
    return { texto: lineas.join("\n"), hayFallas: erroresGlobales.length > 0 };
  }

  lineas.push("| Prueba | Proyecto | Fallas | Tipo | Primer error |", "|---|---|---|---|---|");

  for (const prueba of falladas) {
    const tipo = prueba.fallas === prueba.corridas ? "Falla siempre" : "Intermitente";
    const error = (prueba.error ?? "-").replace(/\|/g, "\\|");
    lineas.push(
      `| ${prueba.archivo}:${prueba.linea} ${prueba.titulo.replace(/\|/g, "\\|")} | ${prueba.proyecto} | ` +
        `${prueba.fallas} de ${prueba.corridas} | ${tipo} | ${error} |`
    );
  }

  return { texto: lineas.join("\n"), hayFallas: true };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const archivo = process.argv[2];

  if (!archivo) {
    console.error("Uso: node scripts/resumen-e2e-nocturno.mjs <reporte.json>");
    process.exit(2);
  }

  if (!existsSync(archivo)) {
    // Playwright no llego a escribir el reporte: fallo antes de correr (build, servidores, setup).
    const texto = `## E2E nocturno\n\nNo hay reporte (${archivo}): la suite no llego a correr. Ver el log del paso anterior.`;
    console.log(texto);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
    }

    process.exit(1);
  }

  const reporte = JSON.parse(readFileSync(archivo, "utf8"));
  const { texto, hayFallas } = armarResumen(contarResultados(reporte), reporte.errors ?? []);

  console.log(texto);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
  }

  process.exit(hayFallas ? 1 : 0);
}
