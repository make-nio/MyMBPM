import express from "express";
import serverless from "serverless-http";

import { createApp } from "./app";

const PREFIJO_FUNCTION = "/.netlify/functions/api";

const app = express();

// Con el rewrite de netlify.toml (/api/* -> function) el path llega como /api/...;
// si la function se invoca directo llega como /.netlify/functions/api/...
// En ambos casos la app Express recibe /api/..., igual que en el servidor local.
app.use((request, _response, next) => {
  if (request.url.startsWith(PREFIJO_FUNCTION)) {
    request.url = `/api${request.url.slice(PREFIJO_FUNCTION.length)}`;
  }

  next();
});

app.use(createApp());

export const handler = serverless(app);
