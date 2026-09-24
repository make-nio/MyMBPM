import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";

import { apiRouter } from "../routes/index";

import { endpoints } from "./endpoints";
import { generarOpenApi } from "./openapi";
import { listarRutasExpress } from "./rutas-express";
import { buscarEndpoint, validarRespuesta } from "./validar-respuesta";

const ARCHIVO_OPENAPI = join(__dirname, "../../../../docs/openapi.json");

describe("contrato de la API", () => {
  it("cada ruta de Express esta en el contrato y el contrato no tiene rutas que no existen", () => {
    const express = listarRutasExpress(apiRouter, "/api").map((ruta) => `${ruta.metodo} ${ruta.ruta}`).sort();
    const contrato = endpoints.map((endpoint) => `${endpoint.metodo} ${endpoint.ruta}`).sort();

    expect(contrato).toEqual(express);
  });

  it("el acceso declarado coincide con los middlewares de cada ruta", () => {
    const rutas = listarRutasExpress(apiRouter, "/api");
    // POST /api/usuarios acepta sin token (cargarAutenticacionOpcional) solo para crear el primer
    // usuario; con usuarios cargados el service exige administrador (usuariosService.crear).
    const excepciones: Record<string, string> = { "post /api/usuarios": "cargarAutenticacionOpcional" };

    const distintos = endpoints.flatMap((endpoint) => {
      const clave = `${endpoint.metodo} ${endpoint.ruta}`;
      const middlewares = rutas.find((ruta) => `${ruta.metodo} ${ruta.ruta}` === clave)?.middlewares ?? [];
      const real = middlewares.includes("requerirAdministrador")
        ? "administrador"
        : middlewares.includes("requerirAutenticacion")
          ? "autenticado"
          : excepciones[clave] && middlewares.includes(excepciones[clave])
            ? "administrador"
            : "publico";
      return real === endpoint.acceso ? [] : [`${clave}: declara ${endpoint.acceso} y la ruta es ${real}`];
    });

    expect(distintos).toEqual([]);
  });

  it("solo health y el ingreso son publicos", () => {
    expect(endpoints.filter((endpoint) => endpoint.acceso === "publico").map((endpoint) => endpoint.ruta)).toEqual([
      "/api/health",
      "/api/autenticacion/login"
    ]);
  });

  it("toda entrada tiene tope: textos, numeros, ids y listas de cuerpos y consultas", () => {
    const sinTope = endpoints.flatMap((endpoint) => [
      ...("body" in endpoint && endpoint.body ? camposSinTope(endpoint.body, "body") : []),
      ...("query" in endpoint && endpoint.query ? camposSinTope(endpoint.query, "query") : [])
    ].map((campo) => `${endpoint.metodo} ${endpoint.ruta} ${campo}`));

    expect(sinTope).toEqual([]);
  });

  it("no repite endpoints", () => {
    const claves = endpoints.map((endpoint) => `${endpoint.metodo} ${endpoint.ruta}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("docs/openapi.json esta al dia (si falla: npm run contrato:generar)", () => {
    const guardado = JSON.parse(readFileSync(ARCHIVO_OPENAPI, "utf8"));
    expect(guardado).toEqual(JSON.parse(JSON.stringify(generarOpenApi())));
  });

  it("una ruta fija gana sobre una con parametro, como en Express", () => {
    expect(buscarEndpoint("post", "/api/clientes/importacion")?.ruta).toBe("/api/clientes/importacion");
    expect(buscarEndpoint("get", "/api/clientes/12")?.ruta).toBe("/api/clientes/{id}");
    expect(buscarEndpoint("get", "/api/no-existe")).toBeNull();
  });

  it("rechaza una respuesta con un campo de mas, un tipo distinto o un status que no es el del contrato", () => {
    const cliente = endpoints.find((endpoint) => endpoint.metodo === "get" && endpoint.ruta === "/api/clientes/{id}");
    expect(cliente).toBeDefined();

    expect(validarRespuesta({ metodo: "GET", ruta: "/api/clientes/1", status: 200, cuerpo: { ok: true, data: { idCliente: 1 } } }))
      .not.toEqual([]);
    expect(validarRespuesta({ metodo: "GET", ruta: "/api/clientes/1", status: 204, cuerpo: null })).toEqual([
      "GET /api/clientes/{id}: respondio 204 y el contrato dice 200"
    ]);
    expect(validarRespuesta({ metodo: "GET", ruta: "/api/no-existe", status: 200, cuerpo: {} })[0]).toContain("no esta en el contrato");
  });

  it("acepta los errores con el formato comun", () => {
    const error = { ok: false, error: { codigo: "NO_ENCONTRADO", message: "Cliente no encontrado", detalles: null, referencia: "abc" } };
    expect(validarRespuesta({ metodo: "GET", ruta: "/api/clientes/1", status: 404, cuerpo: error })).toEqual([]);
    expect(
      validarRespuesta({ metodo: "GET", ruta: "/api/clientes/1", status: 404, cuerpo: { ok: false, error: { message: "x" } } })
    ).not.toEqual([]);
  });
});

// Recorre un schema de entrada y devuelve los campos sin maximo (ver LIMITES en esquemas-comunes).
function camposSinTope(schema: ZodTypeAny, ruta: string): string[] {
  let tipo = schema as ZodTypeAny & { _def: Record<string, unknown> };
  for (let vuelta = 0; vuelta < 10; vuelta++) {
    const nombre = tipo._def.typeName;
    if (nombre === "ZodOptional" || nombre === "ZodNullable" || nombre === "ZodDefault") {
      tipo = tipo._def.innerType as typeof tipo;
    } else if (nombre === "ZodEffects") {
      tipo = tipo._def.schema as typeof tipo;
    } else {
      break;
    }
  }

  const checks = (tipo._def.checks as Array<{ kind: string }> | undefined) ?? [];
  const tieneMaximo = checks.some((check) => check.kind === "max" || check.kind === "length");

  switch (tipo._def.typeName) {
    case "ZodObject":
      return Object.entries((tipo as unknown as { shape: Record<string, ZodTypeAny> }).shape).flatMap(([campo, valor]) =>
        camposSinTope(valor, `${ruta}.${campo}`)
      );
    case "ZodArray":
      return [
        ...(tipo._def.maxLength ? [] : [`${ruta}: lista sin maximo`]),
        ...camposSinTope(tipo._def.type as ZodTypeAny, `${ruta}[]`)
      ];
    case "ZodString":
    case "ZodNumber":
    case "ZodBigInt":
      return tieneMaximo ? [] : [`${ruta}: sin maximo`];
    default:
      return [];
  }
}
