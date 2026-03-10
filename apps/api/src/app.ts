import express from "express";

import { healthRouter } from "./routes/health.routes";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({
      message: "BPM API running"
    });
  });

  app.use("/health", healthRouter);

  return app;
}

