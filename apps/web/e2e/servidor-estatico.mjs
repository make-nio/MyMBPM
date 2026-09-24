// Servidor para las pruebas E2E: emula lo que hace Netlify en produccion.
// - Sirve el export estatico de apps/web/out con "pretty URLs" (/panel -> panel.html).
// - Reenvia /api/* a la API Express, como el rewrite de netlify.toml hacia la function.
// - Aplica los encabezados de out/_headers (los genera scripts/generar-encabezados.mjs), como
//   Netlify: asi los E2E corren con la misma CSP que produccion.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const puerto = Number(process.env.PORT || 3100);
const apiUrl = new URL(process.env.API_URL || "http://localhost:3102");
const raiz = resolve(process.env.WEB_OUT_DIR || new URL("../out", import.meta.url).pathname);

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

// Formato de _headers de Netlify: una ruta ("/*" o exacta) y debajo, con sangria, "Nombre: valor".
function leerEncabezados() {
  const archivo = join(raiz, "_headers");
  if (!existsSync(archivo)) {
    return [];
  }

  const reglas = [];
  for (const linea of readFileSync(archivo, "utf8").split("\n")) {
    if (!linea.trim()) {
      continue;
    }
    if (!/^\s/.test(linea)) {
      reglas.push({ ruta: linea.trim(), encabezados: {} });
    } else if (reglas.length > 0) {
      const separador = linea.indexOf(":");
      reglas[reglas.length - 1].encabezados[linea.slice(0, separador).trim()] = linea.slice(separador + 1).trim();
    }
  }
  return reglas;
}

const reglasEncabezados = leerEncabezados();

function encabezadosPara(pathname) {
  return Object.assign(
    {},
    ...reglasEncabezados
      .filter((regla) => regla.ruta === pathname || (regla.ruta.endsWith("/*") && pathname.startsWith(regla.ruta.slice(0, -1))))
      .map((regla) => regla.encabezados)
  );
}

function resolverArchivo(pathname) {
  const relativo = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidatos = [relativo, `${relativo}.html`, join(relativo, "index.html")];

  for (const candidato of candidatos) {
    const ruta = join(raiz, candidato);

    if (ruta.startsWith(raiz) && existsSync(ruta) && statSync(ruta).isFile()) {
      return ruta;
    }
  }

  return null;
}

function reenviarApi(req, res) {
  const proxy = httpRequest(
    {
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: apiUrl.host }
    },
    (respuestaApi) => {
      res.writeHead(respuestaApi.statusCode ?? 502, respuestaApi.headers);
      respuestaApi.pipe(res);
    }
  );

  proxy.on("error", () => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: { message: "API no disponible" } }));
  });

  req.pipe(proxy);
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    reenviarApi(req, res);
    return;
  }

  const archivo = resolverArchivo(pathname);
  const status = archivo ? 200 : 404;
  const destino = archivo ?? join(raiz, "404.html");

  res.writeHead(status, {
    ...encabezadosPara(pathname),
    "content-type": tipos[extname(destino)] ?? "application/octet-stream"
  });
  createReadStream(destino).pipe(res);
}).listen(puerto, () => {
  console.log(`Web estatica en http://localhost:${puerto} (API: ${apiUrl.origin}, raiz: ${raiz})`);
});
