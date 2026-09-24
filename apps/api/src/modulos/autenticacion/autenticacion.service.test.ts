import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorDemasiadosIntentos } from "../../compartido/errores/error-demasiados-intentos";

import { autenticacionRepository } from "./autenticacion.repository";
import { autenticacionService } from "./autenticacion.service";
import { RETENCION_INTENTOS_MS } from "./limite-intentos";

vi.mock("./autenticacion.repository", () => ({
  autenticacionRepository: {
    obtenerUsuarioParaLogin: vi.fn(),
    obtenerUsuarioSanitizadoPorId: vi.fn(),
    listarFallidosRecientes: vi.fn(),
    registrarFallidos: vi.fn(),
    limpiarFallidos: vi.fn()
  }
}));

const repo = vi.mocked(autenticacionRepository);
const claveHash = bcrypt.hashSync("clave-correcta", 4);
const usuario = { idUsuario: 7n, activo: true, claveHash } as never;
const credenciales = { identificador: "Maxi", password: "clave-correcta" };
const ip = { ip: "203.0.113.9" };

// n fallidos, uno cada 30 segundos, el mas reciente hace 30 segundos.
function fallidos(n: number) {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (i + 1) * 30_000));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NETLIFY_DATABASE_URL", "postgresql://prueba");
  vi.stubEnv("JWT_SECRET", "secreto-de-prueba");
  repo.obtenerUsuarioParaLogin.mockResolvedValue(usuario);
  repo.obtenerUsuarioSanitizadoPorId.mockResolvedValue({ idUsuario: 7n } as never);
  repo.listarFallidosRecientes.mockResolvedValue([]);
});

describe("autenticacionService.login (limite de intentos)", () => {
  it("con 5 fallidos recientes de la cuenta rechaza con 429 sin mirar la clave ni sumar otro", async () => {
    repo.listarFallidosRecientes.mockImplementation(async (clave) => (clave === "usuario:7" ? fallidos(5) : []));

    const error = await autenticacionService.login(credenciales, ip).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDemasiadosIntentos);
    expect((error as ErrorDemasiadosIntentos).statusCode).toBe(429);
    expect((error as Error).message).toMatch(/Proba de nuevo en 15 minutos/);
    expect(repo.registrarFallidos).not.toHaveBeenCalled();
    expect(repo.limpiarFallidos).not.toHaveBeenCalled();
  });

  it("con 20 fallidos recientes desde la misma IP tambien bloquea, aunque la cuenta este limpia", async () => {
    repo.listarFallidosRecientes.mockImplementation(async (clave) => (clave === "ip:203.0.113.9" ? fallidos(20) : []));

    await expect(autenticacionService.login(credenciales, ip)).rejects.toBeInstanceOf(ErrorDemasiadosIntentos);
  });

  it("4 fallidos todavia dejan intentar", async () => {
    repo.listarFallidosRecientes.mockResolvedValue(fallidos(4));

    await expect(autenticacionService.login(credenciales, ip)).resolves.toHaveProperty("token");
  });

  it("una clave incorrecta suma un fallido a la cuenta y a la IP", async () => {
    await expect(
      autenticacionService.login({ ...credenciales, password: "otra" }, ip)
    ).rejects.toBeInstanceOf(ErrorAutenticacion);

    expect(repo.registrarFallidos).toHaveBeenCalledWith(["usuario:7", "ip:203.0.113.9"], expect.any(Date));
  });

  it("al registrar un fallido pide borrar los de mas de 24 horas", async () => {
    const antes = Date.now();

    await autenticacionService.login({ ...credenciales, password: "otra-clave" }, ip).catch(() => undefined);

    const corte = repo.registrarFallidos.mock.calls[0][1].getTime();
    expect(corte).toBeGreaterThanOrEqual(antes - RETENCION_INTENTOS_MS);
    expect(corte).toBeLessThanOrEqual(Date.now() - RETENCION_INTENTOS_MS);
    expect(RETENCION_INTENTOS_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("si la cuenta no existe cuenta por lo que se escribio, sin distinguir mayusculas", async () => {
    repo.obtenerUsuarioParaLogin.mockResolvedValue(null);

    await expect(autenticacionService.login({ identificador: " Nadie ", password: "x" }, ip)).rejects.toBeInstanceOf(
      ErrorAutenticacion
    );

    expect(repo.listarFallidosRecientes).toHaveBeenCalledWith("identificador:nadie", expect.any(Date), 5);
    expect(repo.registrarFallidos).toHaveBeenCalledWith(["identificador:nadie", "ip:203.0.113.9"], expect.any(Date));
  });

  it("un ingreso correcto limpia los fallidos de la cuenta y de la IP", async () => {
    const resultado = await autenticacionService.login(credenciales, ip);

    expect(resultado.token).toEqual(expect.any(String));
    expect(repo.limpiarFallidos).toHaveBeenCalledWith(["usuario:7", "ip:203.0.113.9"]);
    expect(repo.registrarFallidos).not.toHaveBeenCalled();
  });

  it("sin IP conocida limita solo por cuenta", async () => {
    await autenticacionService.login(credenciales, { ip: null });

    expect(repo.listarFallidosRecientes).toHaveBeenCalledTimes(1);
    expect(repo.limpiarFallidos).toHaveBeenCalledWith(["usuario:7"]);
  });
});
