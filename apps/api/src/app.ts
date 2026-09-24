import express from "express";

import { getEnv } from "./config/env";
import { manejoErroresMiddleware } from "./compartido/middlewares/manejo-errores.middleware";
import { noEncontradoMiddleware } from "./compartido/middlewares/no-encontrado.middleware";
import { referenciaMiddleware } from "./compartido/middlewares/referencia.middleware";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  // Valida variables requeridas al arrancar (o en el cold start de la function).
  getEnv();

  app.use(referenciaMiddleware);
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({
      message: "BPM API running"
    });
  });

  app.use("/api", apiRouter);
  app.use(noEncontradoMiddleware);
  app.use(manejoErroresMiddleware);

  return app;
}

