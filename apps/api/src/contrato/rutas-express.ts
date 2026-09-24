import { Router } from "express";

type Capa = {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  handle: { stack?: Capa[] };
  regexp: RegExp & { fast_slash?: boolean };
};

// Prefijo de un router montado con use("/algo", router): Express 4 solo guarda la regexp.
function prefijoDe(capa: Capa) {
  if (capa.regexp.fast_slash) {
    return "";
  }
  const coincidencia = capa.regexp.source.match(/^\^\\(\/.*?)\\\/\?\(\?=\\\/\|\$\)$/);
  if (!coincidencia) {
    throw new Error(`No se pudo leer el prefijo de un router: ${capa.regexp.source}`);
  }
  return coincidencia[1].replace(/\\\//g, "/");
}

// Todas las rutas de un router de Express, con la sintaxis del contrato (/clientes/{id}).
export function listarRutasExpress(router: Router, prefijo = ""): Array<{ metodo: string; ruta: string }> {
  const rutas: Array<{ metodo: string; ruta: string }> = [];

  for (const capa of (router as unknown as { stack: Capa[] }).stack) {
    if (capa.route) {
      const ruta = `${prefijo}${capa.route.path === "/" ? "" : capa.route.path}`.replace(/:(\w+)/g, "{$1}") || "/";
      for (const metodo of Object.keys(capa.route.methods)) {
        rutas.push({ metodo, ruta });
      }
    } else if (capa.name === "router" && capa.handle.stack) {
      rutas.push(...listarRutasExpress(capa.handle as unknown as Router, `${prefijo}${prefijoDe(capa)}`));
    }
  }

  return rutas;
}
