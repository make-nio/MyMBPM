// Paso de migraciones del build de Netlify (npm run build:netlify).
//
// En el sitio, NETLIFY_DATABASE_URL tiene el mismo valor en todos los contextos: un deploy
// preview apunta a la base de PRODUCCION. Por eso solo el deploy de produccion (CONTEXT=production)
// aplica migraciones. En previews y branch deploys solo se informa si hay migraciones pendientes
// (prisma migrate status, que no escribe): ese preview corre contra el schema de produccion.
import { spawnSync } from "node:child_process";

const contexto = process.env.CONTEXT;

function prisma(script) {
  return spawnSync("npm", ["run", script, "--workspace", "@myfirstproject/api"], {
    stdio: "inherit",
    env: process.env
  });
}

if (contexto === "production") {
  console.log("[migraciones] Contexto production: aplicando prisma migrate deploy.");
  const resultado = prisma("prisma:migrate:deploy");
  process.exit(resultado.status ?? 1);
}

console.log(
  `[migraciones] Contexto "${contexto ?? "local"}": se omite prisma migrate deploy ` +
    "(la base de los deploy previews es la de produccion)."
);

if (contexto && process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
  const estado = prisma("prisma:migrate:status");

  if (estado.status !== 0) {
    console.warn(
      "[migraciones] AVISO: este deploy trae migraciones que no estan aplicadas en la base. " +
        "El preview corre contra el schema actual de produccion y puede fallar en lo que dependa " +
        "de ellas. Se aplican recien al integrar en main."
    );
  }
}
