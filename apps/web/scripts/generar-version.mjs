// Escribe apps/web/out/version.json con el commit del build. La prueba de humo de produccion
// (.github/workflows/humo-produccion.yml) lo consulta para saber cuando termino de publicarse
// el deploy de un commit. Netlify define COMMIT_REF y CONTEXT en el build; en local quedan null.
// El repositorio es publico: el commit no es un dato sensible.
import { writeFileSync } from "node:fs";

const salida = new URL("../out/version.json", import.meta.url).pathname;

writeFileSync(
  salida,
  `${JSON.stringify({
    commit: process.env.COMMIT_REF || null,
    contexto: process.env.CONTEXT || null,
    generado: new Date().toISOString()
  })}\n`
);

console.log(`version.json: ${process.env.COMMIT_REF || "sin commit (build local)"}`);
