// Servidor para las pruebas E2E: emula lo que hace Netlify en produccion.
// - Sirve el export estatico de apps/web/out con "pretty URLs" (/panel -> panel.html).
// - Reenvia /api/* a la API Express, como el rewrite de netlify.toml hacia la function.
import { createReadStream, existsSync, statSync } from "node:fs";
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

  res.writeHead(status, { "content-type": tipos[extname(destino)] ?? "application/octet-stream" });
  createReadStream(destino).pipe(res);
}).listen(puerto, () => {
  console.log(`Web estatica en http://localhost:${puerto} (API: ${apiUrl.origin}, raiz: ${raiz})`);
});
