import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { autenticacionRepository } from "../../modulos/autenticacion/autenticacion.repository";
import { ErrorAutenticacion } from "../errores/error-autenticacion";

import { requerirAutenticacion } from "./requerir-autenticacion.middleware";

vi.mock("../../modulos/autenticacion/autenticacion.repository", () => ({
  autenticacionRepository: { obtenerUsuarioSanitizadoPorId: vi.fn(), obtenerSesionesValidasDesde: vi.fn() }
}));

const repo = vi.mocked(autenticacionRepository);
const SECRETO = "secreto-de-prueba";

function solicitudCon(iat: number) {
  const token = jwt.sign({ sub: "5", iat }, SECRETO, { expiresIn: 3600 });
  return { headers: { authorization: `Bearer ${token}` } } as Request;
}

async function autenticar(request: Request) {
  const next = vi.fn();
  await requerirAutenticacion(request, {} as Response, next);
  return next.mock.calls[0][0] as unknown;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.JWT_SECRET = SECRETO;
  process.env.NETLIFY_DATABASE_URL ??= "postgresql://prueba";
  repo.obtenerUsuarioSanitizadoPorId.mockResolvedValue({ idUsuario: 5n, activo: true } as never);
});

describe("requerirAutenticacion y el corte de sesiones", () => {
  const ahora = Math.floor(Date.now() / 1000);

  it("sin corte, el token vale", async () => {
    repo.obtenerSesionesValidasDesde.mockResolvedValue(null);
    const request = solicitudCon(ahora);

    expect(await autenticar(request)).toBeUndefined();
    expect(request.usuarioAutenticado).toMatchObject({ idUsuario: 5n });
  });

  it("un token emitido antes del corte se rechaza", async () => {
    repo.obtenerSesionesValidasDesde.mockResolvedValue(new Date((ahora - 10) * 1000));

    const error = await autenticar(solicitudCon(ahora - 60));

    expect(error).toBeInstanceOf(ErrorAutenticacion);
    expect((error as Error).message).toBe("La sesion se cerro: ingresa de nuevo");
  });

  it("un token emitido despues del corte vale", async () => {
    repo.obtenerSesionesValidasDesde.mockResolvedValue(new Date((ahora - 60) * 1000));

    expect(await autenticar(solicitudCon(ahora))).toBeUndefined();
  });
});
