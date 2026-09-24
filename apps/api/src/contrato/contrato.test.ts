import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

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
