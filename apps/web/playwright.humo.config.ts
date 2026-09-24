import { defineConfig, devices } from "@playwright/test";

// Prueba de humo contra un sitio ya publicado (produccion o un deploy preview). Solo lectura: no
// inicia sesion, no escribe nada y no levanta servidores ni toca ninguna base. Por eso es una
// config aparte de playwright.config.ts (que solo corre contra un Postgres local).
//
//   URL_HUMO=https://mymbpm.netlify.app npm run test:humo --workspace @myfirstproject/web
const baseURL = process.env.URL_HUMO;

if (!baseURL) {
  throw new Error("Falta URL_HUMO: la direccion del sitio publicado a revisar.");
}

export default defineConfig({
  testDir: "./e2e/humo",
  testMatch: /.*\.humo\.ts$/,
  fullyParallel: false,
  workers: 1,
  // Un reintento por si la red del runner falla una vez; dos fallas seguidas son reales.
  retries: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE || undefined }
  }
});
