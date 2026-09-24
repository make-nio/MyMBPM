import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../errores/error-conflicto";

import { columnasDuplicadas, manejoErroresMiddleware, mensajeDuplicado } from "./manejo-errores.middleware";
import { generarReferencia, referenciaMiddleware } from "./referencia.middleware";

function solicitud(extra: Partial<Request> = {}) {
  return {
    referencia: "3F9A-12BC",
    method: "POST",
    url: "/api/pedidos?busqueda=juan",
    originalUrl: "/api/pedidos?busqueda=juan",
    headers: { "x-nf-request-id": "01HNETLIFY" },
    usuarioAutenticado: { idUsuario: 7n },
    ...extra
  } as unknown as Request;
}

function respuesta() {
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("referencia", () => {
  it("genera un codigo corto de 8 caracteres hexadecimales", () => {
    expect(generarReferencia()).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(generarReferencia()).not.toBe(generarReferencia());
  });

  it("la deja en la solicitud y en el header X-Referencia", () => {
    const req = {} as Request;
    const res = respuesta();
    const next = vi.fn();

    referenciaMiddleware(req, res as unknown as Response, next);

    expect(req.referencia).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(res.setHeader).toHaveBeenCalledWith("X-Referencia", req.referencia);
    expect(next).toHaveBeenCalled();
  });
});

describe("manejoErroresMiddleware", () => {
  it("un error inesperado responde 500 con la referencia y la deja en el log con la ruta sin query", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = respuesta();

    manejoErroresMiddleware(new Error("se rompio"), solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: { codigo: "ERROR_INTERNO", message: "Ocurrio un error interno", referencia: "3F9A-12BC" }
    });
    const linea = JSON.parse(log.mock.calls[0][0] as string);
    expect(linea).toMatchObject({
      nivel: "error",
      referencia: "3F9A-12BC",
      idNetlify: "01HNETLIFY",
      metodo: "POST",
      ruta: "/api/pedidos",
      idUsuario: "7",
      error: { nombre: "Error", mensaje: "se rompio" }
    });
    expect(linea.error.pila).toContain("se rompio");
  });

  it("sin base de datos responde 500 con su codigo y tambien queda en el log", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = respuesta();

    manejoErroresMiddleware(
      new Prisma.PrismaClientInitializationError("no conecta", "6.19.3"),
      solicitud(),
      res as unknown as Response,
      vi.fn()
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toMatchObject({ codigo: "BASE_DATOS_NO_DISPONIBLE", referencia: "3F9A-12BC" });
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("los errores de negocio no van al log de errores y tambien llevan la referencia", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = respuesta();

    manejoErroresMiddleware(new ErrorConflicto("Stock insuficiente"), solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error).toMatchObject({ message: "Stock insuficiente", referencia: "3F9A-12BC" });
    expect(log).not.toHaveBeenCalled();
  });

  it("un cuerpo que no es JSON es un 400, no un 500", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = respuesta();

    manejoErroresMiddleware(Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed" }), solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(log).not.toHaveBeenCalled();
  });

  it("un cuerpo demasiado grande es un 413, no un 500", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = respuesta();

    manejoErroresMiddleware(Object.assign(new Error("request entity too large"), { type: "entity.too.large" }), solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(log).not.toHaveBeenCalled();
  });

  it("traduce los errores conocidos de Prisma", () => {
    const res = respuesta();
    const duplicado = new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "6.19.3" });

    manejoErroresMiddleware(duplicado, solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("un duplicado dice que dato se repite y como se arregla", () => {
    const res = respuesta();
    const duplicado = new Prisma.PrismaClientKnownRequestError("duplicado", {
      code: "P2002",
      clientVersion: "6.19.3",
      meta: { modelName: "Categoria", target: ["SLUG"] }
    });

    manejoErroresMiddleware(duplicado, solicitud(), res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error.message).toBe(
      "Ya existe otro registro con ese slug: elegi uno distinto y volve a guardar"
    );
  });

  it("con el adapter de pg (Prisma 7) saca las columnas del nombre del indice", () => {
    const meta = {
      modelName: "Categoria",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: { kind: "UniqueConstraintViolation", constraint: { index: "UQ_CATEGORIA_SLUG" }, table: "CATEGORIA" }
      }
    };

    expect(columnasDuplicadas(meta)).toEqual(["SLUG"]);
    expect(columnasDuplicadas({ driverAdapterError: { cause: { constraint: { fields: ["EMAIL"] } } } })).toEqual(["EMAIL"]);
    expect(columnasDuplicadas({ driverAdapterError: { cause: { constraint: { index: "OTRO" } } } })).toEqual([]);
    expect(mensajeDuplicado(meta)).toBe("Ya existe otro registro con ese slug: elegi uno distinto y volve a guardar");

    const res = respuesta();
    const duplicado = new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "7.10.0", meta });
    manejoErroresMiddleware(duplicado, solicitud(), res as unknown as Response, vi.fn());
    expect(res.json.mock.calls[0][0].error.detalles.target).toEqual(["SLUG"]);
  });

  it("un duplicado de una columna desconocida no inventa el nombre", () => {
    expect(mensajeDuplicado({ target: ["OTRA"] })).toBe(
      "Ya existe un registro con un valor unico duplicado: cambia ese dato y volve a guardar"
    );
    expect(mensajeDuplicado(undefined)).toContain("cambia ese dato");
  });
});
