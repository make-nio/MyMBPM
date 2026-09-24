import express from "express";

import { getEnv } from "./config/env";
import { encabezadosSeguridadMiddleware } from "./compartido/middlewares/encabezados-seguridad.middleware";
import { manejoErroresMiddleware } from "./compartido/middlewares/manejo-errores.middleware";
import { noEncontradoMiddleware } from "./compartido/middlewares/no-encontrado.middleware";
import { referenciaMiddleware } from "./compartido/middlewares/referencia.middleware";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Valida variables requeridas al arrancar (o en el cold start de la function).
  getEnv();

  app.use(referenciaMiddleware);
  app.use(encabezadosSeguridadMiddleware);
  // 100 KB para todo, salvo la importacion de catalogo (hasta 1000 filas de CSV).
  const jsonGeneral = express.json();
  const jsonImportacion = express.json({ limit: "2mb" });
  app.use((request, response, next) =>
    request.path.startsWith("/api/items-catalogo/importacion")
      ? jsonImportacion(request, response, next)
      : jsonGeneral(request, response, next)
  );

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

