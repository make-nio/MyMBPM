import { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { encabezadosSeguridadMiddleware } from "./encabezados-seguridad.middleware";

describe("encabezadosSeguridadMiddleware", () => {
  it("pone los encabezados de seguridad y que no se guarde en cache", () => {
    const res = { setHeader: vi.fn(), removeHeader: vi.fn() };
    const next = vi.fn();

    encabezadosSeguridadMiddleware({} as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "strict-origin-when-cross-origin");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(next).toHaveBeenCalled();
  });
});
