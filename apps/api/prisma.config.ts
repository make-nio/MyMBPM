// Configuracion del CLI de Prisma 7 (generate, migrate). Netlify DB (Neon) inyecta
// NETLIFY_DATABASE_URL (pooled, la usa la API) y NETLIFY_DATABASE_URL_UNPOOLED (directa):
// Prisma Migrate necesita la directa. En local las dos pueden ser la misma base (apps/api/.env).
import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Sin variables (por ejemplo, npm install en un clon nuevo) generate funciona igual; migrate
    // falla con un error claro de conexion.
    url: process.env.NETLIFY_DATABASE_URL_UNPOOLED ?? process.env.NETLIFY_DATABASE_URL ?? ""
  }
});
