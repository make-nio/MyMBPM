import { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { ErrorAutenticacion } from "../errores/error-autenticacion";
import { ErrorProhibido } from "../errores/error-prohibido";

import { requerirAdministrador } from "./requerir-administrador.middleware";

function ejecutar(usuarioAutenticado?: Partial<NonNullable<Request["usuarioAutenticado"]>>) {
  const next = vi.fn();
  requerirAdministrador({ usuarioAutenticado } as Request, {} as Response, next);
  return next;
}

describe("requerirAdministrador", () => {
  it("deja pasar a un administrador", () => {
    const next = ejecutar({ idUsuario: 1n, esAdministrador: true });

    expect(next).toHaveBeenCalledWith();
  });

  it("responde 403 a un usuario que no es administrador", () => {
    const next = ejecutar({ idUsuario: 2n, esAdministrador: false });

    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorProhibido);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it("responde 401 si no hay usuario autenticado", () => {
    const next = ejecutar();

    expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorAutenticacion);
  });
});
