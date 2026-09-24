import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorProhibido } from "../../compartido/errores/error-prohibido";
import { prisma } from "../../lib/prisma";

import { usuariosRepository } from "./usuarios.repository";
import { usuariosService } from "./usuarios.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("./usuarios.repository", () => ({
  usuariosRepository: {
    bloquearAltaUsuarios: vi.fn(),
    contarUsuarios: vi.fn(),
    buscarPorEmailOUsuario: vi.fn(),
    crear: vi.fn()
  }
}));

const repo = vi.mocked(usuariosRepository);

const altaUsuario = {
  nombre: "Maxi",
  apellido: "MyM",
  email: "maxi@mym.dev",
  usuario: "maxi",
  password: "12345678"
};

const administrador = { idUsuario: 1n, esAdministrador: true };
const operador = { idUsuario: 2n, esAdministrador: false };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
  repo.buscarPorEmailOUsuario.mockResolvedValue(null);
  repo.crear.mockImplementation(((_tx: unknown, data: unknown) => Promise.resolve(data)) as never);
});

describe("usuariosService.crear sin usuarios (alta inicial)", () => {
  beforeEach(() => {
    repo.contarUsuarios.mockResolvedValue(0);
  });

  it("permite el alta sin sesion y el primer usuario queda administrador y activo", async () => {
    await usuariosService.crear({ ...altaUsuario, activo: false, esAdministrador: false });

    const creado = repo.crear.mock.calls[0][1];
    expect(creado).toMatchObject({ usuario: "maxi", esAdministrador: true, activo: true });
    expect(creado).not.toHaveProperty("password");
    expect(creado.claveHash).not.toBe(altaUsuario.password);
  });

  it("toma el bloqueo de altas antes de contar usuarios", async () => {
    await usuariosService.crear(altaUsuario);

    expect(repo.bloquearAltaUsuarios).toHaveBeenCalledWith(tx);
    expect(repo.bloquearAltaUsuarios.mock.invocationCallOrder[0]).toBeLessThan(
      repo.contarUsuarios.mock.invocationCallOrder[0]
    );
  });
});

describe("usuariosService.crear con usuarios existentes", () => {
  beforeEach(() => {
    repo.contarUsuarios.mockResolvedValue(1);
  });

  it("rechaza el alta sin sesion con 401", async () => {
    await expect(usuariosService.crear(altaUsuario)).rejects.toBeInstanceOf(ErrorAutenticacion);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("sin sesion responde 401 aunque el usuario ya exista, sin revelar duplicados", async () => {
    repo.buscarPorEmailOUsuario.mockResolvedValue({ idUsuario: 1n } as never);

    await expect(usuariosService.crear(altaUsuario)).rejects.toBeInstanceOf(ErrorAutenticacion);
    expect(repo.buscarPorEmailOUsuario).not.toHaveBeenCalled();
  });

  it("rechaza el alta de un usuario que no es administrador con 403", async () => {
    const alta = usuariosService.crear(altaUsuario, operador);

    await expect(alta).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(alta).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("un administrador crea usuarios no administradores por defecto", async () => {
    await usuariosService.crear(altaUsuario, administrador);

    expect(repo.crear.mock.calls[0][1]).toMatchObject({ usuario: "maxi", esAdministrador: false });
  });

  it("un administrador puede crear otro administrador", async () => {
    await usuariosService.crear({ ...altaUsuario, esAdministrador: true }, administrador);

    expect(repo.crear.mock.calls[0][1]).toMatchObject({ esAdministrador: true });
  });

  it("rechaza duplicados de email o usuario", async () => {
    repo.buscarPorEmailOUsuario.mockResolvedValue({ idUsuario: 5n } as never);

    await expect(usuariosService.crear(altaUsuario, administrador)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.crear).not.toHaveBeenCalled();
  });
});
