// Genera apps/web/out/_headers (lo lee Netlify del directorio publicado) con los encabezados de
// seguridad del sitio. Corre despues de `next build` (script "build" de la web).
//
// La CSP no permite scripts inline arbitrarios ('unsafe-inline'): el export estatico de Next
// mete scripts inline en cada pagina (el payload de React), asi que se calculan sus hashes
// sha256 y se permiten solo esos. Una sola CSP para todo el sitio ("/*"): si dos reglas de
// Netlify definen CSP para la misma ruta, se aplican las dos y la pagina queda bloqueada.
//
// CSP_SOLO_REPORTE=1 la publica como Content-Security-Policy-Report-Only (no bloquea, solo avisa
// en la consola del navegador), por si hay que diagnosticar algo en produccion.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const salida = new URL("../out/", import.meta.url).pathname;

function archivosHtml(directorio) {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) {
      return archivosHtml(ruta);
    }
    return nombre.endsWith(".html") ? [ruta] : [];
  });
}

const SCRIPT_INLINE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const hashes = new Set();

for (const archivo of archivosHtml(salida)) {
  for (const [, contenido] of readFileSync(archivo, "utf8").matchAll(SCRIPT_INLINE)) {
    hashes.add(`'sha256-${createHash("sha256").update(contenido, "utf8").digest("base64")}'`);
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(" ")}`,
  // React pone estilos con style=""; Next no mete <style> propios. Es el riesgo menor de una CSP.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // La API esta en el mismo dominio (/api/*).
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const encabezados = {
  [process.env.CSP_SOLO_REPORTE === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"]: csp,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin"
};

writeFileSync(
  join(salida, "_headers"),
  `/*\n${Object.entries(encabezados)
    .map(([nombre, valor]) => `  ${nombre}: ${valor}`)
    .join("\n")}\n`
);

console.log(`[encabezados] _headers con ${hashes.size} hashes de scripts inline (${csp.length} caracteres de CSP).`);
