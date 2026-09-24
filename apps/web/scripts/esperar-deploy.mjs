// Espera a que un sitio publicado sirva el build de un commit (lee /version.json, que escribe
// scripts/generar-version.mjs). Lo usa la prueba de humo de produccion despues de cada push a
// main: Netlify tarda unos minutos en construir y publicar.
//
//   node scripts/esperar-deploy.mjs <url> <commit> [minutos]
const [url, commit, minutos = "20"] = process.argv.slice(2);

if (!url || !commit) {
  console.error("Uso: node scripts/esperar-deploy.mjs <url> <commit> [minutos]");
  process.exit(2);
}

const limite = Date.now() + Number(minutos) * 60_000;
let ultimo = "sin respuesta";

while (Date.now() < limite) {
  try {
    const respuesta = await fetch(`${url}/version.json?t=${Date.now()}`, { cache: "no-store" });

    if (respuesta.ok) {
      const version = await respuesta.json();
      ultimo = version.commit ?? "sin commit";

      if (version.commit === commit) {
        console.log(`Publicado ${commit} en ${url} (build ${version.generado}).`);
        process.exit(0);
      }
    } else {
      ultimo = `HTTP ${respuesta.status}`;
    }
  } catch (error) {
    ultimo = error instanceof Error ? error.message : String(error);
  }

  console.log(`Todavia no: ${url} sirve ${ultimo}. Espero 20 s...`);
  await new Promise((resolver) => setTimeout(resolver, 20_000));
}

console.error(
  `El deploy de ${commit} no aparecio en ${url} en ${minutos} min (ultimo: ${ultimo}). ` +
    "Revisa el deploy de produccion en Netlify: puede haber fallado el build."
);
process.exit(1);
