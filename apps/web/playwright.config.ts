import { defineConfig, devices } from "@playwright/test";

import {
  ARCHIVO_SESION_ADMIN,
  BASE_DATOS_E2E,
  COBERTURA_E2E,
  PUERTO_API,
  PUERTO_WEB,
  URL_WEB,
  validarBaseLocal
} from "./e2e/entorno";

validarBaseLocal(BASE_DATOS_E2E);

// En el contenedor de Claude Code el Chromium disponible no coincide con la version de
// Playwright; PW_CHROMIUM_EXECUTABLE permite usarlo. En CI se usa el de "playwright install".
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: URL_WEB,
    trace: "retain-on-failure",
    launchOptions: { executablePath }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: ARCHIVO_SESION_ADMIN }
    }
  ],
  webServer: [
    {
      // La API compilada (npm run build), como en produccion pero como proceso Node.
      command: "node --enable-source-maps dist/server.js",
      cwd: "../api",
      url: `http://localhost:${PUERTO_API}/api/health`,
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
      env: {
        PORT: String(PUERTO_API),
        NETLIFY_DATABASE_URL: BASE_DATOS_E2E,
        JWT_SECRET: "secreto-solo-para-e2e",
        JWT_EXPIRES_IN: "1h",
        ...(COBERTURA_E2E ? { NODE_V8_COVERAGE: "coverage/e2e-raw" } : {})
      }
    },
    {
      // El export estatico (apps/web/out) + /api/* reenviado a la API, como en Netlify.
      command: "node e2e/servidor-estatico.mjs",
      url: `${URL_WEB}/ingresar`,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(PUERTO_WEB),
        API_URL: `http://localhost:${PUERTO_API}`
      }
    }
  ]
});
