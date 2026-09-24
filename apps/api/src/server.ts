import dotenv from "dotenv";

import { createApp } from "./app";
import { getEnv } from "./config/env";

dotenv.config();

const env = getEnv();
const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

// Cierre ordenado: termina las requests en curso y sale con exit normal. Ademas permite que
// Node escriba la cobertura (NODE_V8_COVERAGE) cuando Playwright detiene la API en los E2E.
for (const senal of ["SIGTERM", "SIGINT"] as const) {
  process.on(senal, () => {
    server.close(() => process.exit(0));
  });
}
