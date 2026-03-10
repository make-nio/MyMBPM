import express from "express";

import { manejoErroresMiddleware } from "./compartido/middlewares/manejo-errores.middleware";
import { noEncontradoMiddleware } from "./compartido/middlewares/no-encontrado.middleware";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

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

