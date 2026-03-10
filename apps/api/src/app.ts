import express from "express";

import { getEnv } from "./config/env";
import { manejoErroresMiddleware } from "./compartido/middlewares/manejo-errores.middleware";
import { noEncontradoMiddleware } from "./compartido/middlewares/no-encontrado.middleware";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();
  const env = getEnv();

  app.use((request, response, next) => {
    const requestOrigin = request.headers.origin;

    if (!requestOrigin || env.corsOrigins.includes(requestOrigin)) {
      response.header("Access-Control-Allow-Origin", requestOrigin ?? "*");
      response.header("Vary", "Origin");
    }

    response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

    if (request.method === "OPTIONS") {
      response.sendStatus(204);
      return;
    }

    next();
  });

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

