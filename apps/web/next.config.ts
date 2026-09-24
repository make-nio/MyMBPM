import path from "node:path";

import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// La web y la API se sirven desde el mismo origen: en Netlify la API es una function
// bajo /api/* (ver netlify.toml). En desarrollo, next dev reenvia /api/* a la API local.
// CONTEXT lo define Netlify en el build (production, deploy-preview, branch-deploy). La web lo
// usa para avisar en los previews que se trabaja sobre la base real (src/lib/entorno.ts).
const env = { NEXT_PUBLIC_CONTEXTO_DESPLIEGUE: process.env.CONTEXT ?? "" };
// La raiz del monorepo, explicita: si hay otro package-lock.json mas arriba (por ejemplo en el
// home de la maquina), Next la infiere mal y avisa en cada build.
const raizMonorepo = path.join(__dirname, "..", "..");

export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    const apiDevUrl = process.env.API_DEV_URL || "http://localhost:3002";

    return {
      reactStrictMode: true,
      env,
      outputFileTracingRoot: raizMonorepo,
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${apiDevUrl}/api/:path*` }];
      }
    };
  }

  // Todas las pantallas son client-side (sesion en localStorage), asi que se publican
  // como sitio estatico en apps/web/out.
  return {
    reactStrictMode: true,
    env,
    outputFileTracingRoot: raizMonorepo,
    output: "export",
    // Solo para medir cobertura en los E2E: el build de Netlify no publica source maps.
    productionBrowserSourceMaps: process.env.E2E_COVERAGE === "1"
  };
}
