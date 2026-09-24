import { Router } from "express";

type Capa = {
  route?: { path: string; methods: Record<string, boolean>; stack: Capa[] };
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

export type RutaExpress = {
  metodo: string;
  // Con la sintaxis del contrato: /clientes/{id}
  ruta: string;
  // Nombres de los middlewares y handlers que recorre, en orden (router.use y los de la ruta).
  middlewares: string[];
};

// Todas las rutas de un router de Express, con los middlewares que las protegen.
export function listarRutasExpress(router: Router, prefijo = "", heredados: string[] = []): RutaExpress[] {
  const rutas: RutaExpress[] = [];
  const previos = [...heredados];

  for (const capa of (router as unknown as { stack: Capa[] }).stack) {
    if (capa.route) {
      const ruta = `${prefijo}${capa.route.path === "/" ? "" : capa.route.path}`.replace(/:(\w+)/g, "{$1}") || "/";
      const propios = capa.route.stack.map((paso) => paso.name ?? "");
      for (const metodo of Object.keys(capa.route.methods)) {
        rutas.push({ metodo, ruta, middlewares: [...previos, ...propios] });
      }
    } else if (capa.name === "router" && capa.handle.stack) {
      rutas.push(...listarRutasExpress(capa.handle as unknown as Router, `${prefijo}${prefijoDe(capa)}`, previos));
    } else if (capa.name) {
      // router.use(middleware): aplica a todo lo que se registra despues en este router.
      previos.push(capa.name);
    }
  }

  return rutas;
}
