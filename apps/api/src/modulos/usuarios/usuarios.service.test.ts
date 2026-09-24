import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { ErrorProhibido } from "../../compartido/errores/error-prohibido";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
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
    bloquearGestionUsuarios: vi.fn(),
    contarUsuarios: vi.fn(),
    contarAdministradoresActivos: vi.fn(),
    obtenerPorId: vi.fn(),
    buscarPorEmailOUsuario: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    obtenerPorIdConClave: vi.fn()
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

    expect(repo.bloquearGestionUsuarios).toHaveBeenCalledWith(tx);
    expect(repo.bloquearGestionUsuarios.mock.invocationCallOrder[0]).toBeLessThan(
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
  it("el duplicado dice cual dato se repite, para marcar ese campo", async () => {
    repo.buscarPorEmailOUsuario.mockResolvedValue({ idUsuario: 5n, email: altaUsuario.email.toUpperCase() } as never);
    await expect(usuariosService.crear(altaUsuario, administrador)).rejects.toMatchObject({
      message: "Ya existe un usuario con ese email: usa otro y volve a guardar",
      detalles: { target: ["EMAIL"] }
    });

    repo.buscarPorEmailOUsuario.mockResolvedValue({ idUsuario: 5n, email: "otro@mym.test" } as never);
    await expect(usuariosService.crear(altaUsuario, administrador)).rejects.toMatchObject({
      message: "Ya existe un usuario con ese nombre de usuario: usa otro y volve a guardar",
      detalles: { target: ["USUARIO"] }
    });
  });
});

describe("usuariosService.cambiarEstado", () => {
  function usuarioGuardado(esAdministrador: boolean, activo = true) {
    return { idUsuario: 3n, esAdministrador, activo } as never;
  }

  it("falla si el usuario no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(usuariosService.cambiarEstado(3n, false)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("no permite desactivar al unico administrador activo", async () => {
    repo.obtenerPorId.mockResolvedValue(usuarioGuardado(true));
    repo.contarAdministradoresActivos.mockResolvedValue(1);

    await expect(usuariosService.cambiarEstado(3n, false)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("permite desactivar a un administrador si queda otro activo", async () => {
    repo.obtenerPorId.mockResolvedValue(usuarioGuardado(true));
    repo.contarAdministradoresActivos.mockResolvedValue(2);

    await usuariosService.cambiarEstado(3n, false);

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 3n, { activo: false });
  });

  it("desactiva operadores sin contar administradores, bajo el bloqueo de gestion", async () => {
    repo.obtenerPorId.mockResolvedValue(usuarioGuardado(false));

    await usuariosService.cambiarEstado(3n, false);

    expect(repo.bloquearGestionUsuarios).toHaveBeenCalledWith(tx);
    expect(repo.contarAdministradoresActivos).not.toHaveBeenCalled();
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 3n, { activo: false });
  });
});

describe("usuariosService.actualizar", () => {
  const unicoAdmin = { idUsuario: 1n, esAdministrador: true, activo: true } as never;

  beforeEach(() => {
    repo.obtenerPorId.mockResolvedValue(unicoAdmin);
    repo.contarAdministradoresActivos.mockResolvedValue(1);
  });

  it("no permite desactivar al unico administrador por PATCH /:id (misma regla que /estado)", async () => {
    await expect(usuariosService.actualizar(1n, { activo: false })).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("no permite quitarle el rol al unico administrador activo", async () => {
    await expect(usuariosService.actualizar(1n, { esAdministrador: false })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("permite quitarle el rol si queda otro administrador activo", async () => {
    repo.contarAdministradoresActivos.mockResolvedValue(2);

    await usuariosService.actualizar(1n, { esAdministrador: false });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { esAdministrador: false });
  });

  it("edita datos del unico administrador sin tocar su rol", async () => {
    await usuariosService.actualizar(1n, { nombre: "Mariano" });

    expect(repo.contarAdministradoresActivos).not.toHaveBeenCalled();
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { nombre: "Mariano" });
  });

  it("promueve a un operador a administrador", async () => {
    repo.obtenerPorId.mockResolvedValue({ idUsuario: 2n, esAdministrador: false, activo: true } as never);

    await usuariosService.actualizar(2n, { esAdministrador: true });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 2n, { esAdministrador: true });
  });

  it("rechaza email o usuario duplicados", async () => {
    repo.buscarPorEmailOUsuario.mockResolvedValue({ idUsuario: 9n } as never);

    await expect(usuariosService.actualizar(1n, { email: "otro@mym.dev" })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.buscarPorEmailOUsuario).toHaveBeenCalledWith(tx, {
      email: "otro@mym.dev",
      usuario: undefined,
      excluirIdUsuario: 1n
    });
  });
});

describe("usuariosService.restablecerClave", () => {
  it("guarda el hash de la clave nueva, nunca la clave en claro", async () => {
    repo.obtenerPorId.mockResolvedValue({ idUsuario: 2n } as never);

    await usuariosService.restablecerClave(2n, "clave-nueva-123");

    const [, idUsuario, cambios] = repo.actualizar.mock.calls[0];
    expect(idUsuario).toBe(2n);
    expect(Object.keys(cambios)).toEqual(["claveHash"]);
    expect(cambios.claveHash).not.toBe("clave-nueva-123");
    expect(cambios.claveHash).toMatch(/^\$2[aby]\$/);
  });

  it("falla si el usuario no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(usuariosService.restablecerClave(99n, "clave-nueva-123")).rejects.toBeInstanceOf(
      ErrorNoEncontrado
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("usuariosService.verificarPermisoAlta", () => {
  it("con usuarios cargados, sin sesion responde 401 y un operador 403, antes de validar el cuerpo", async () => {
    repo.contarUsuarios.mockResolvedValue(3);

    await expect(usuariosService.verificarPermisoAlta()).rejects.toBeInstanceOf(ErrorAutenticacion);
    await expect(usuariosService.verificarPermisoAlta({ idUsuario: 2n, esAdministrador: false })).rejects.toBeInstanceOf(
      ErrorProhibido
    );
    await expect(usuariosService.verificarPermisoAlta({ idUsuario: 1n, esAdministrador: true })).resolves.toBeUndefined();
  });

  it("sin usuarios deja pasar el alta inicial", async () => {
    repo.contarUsuarios.mockResolvedValue(0);

    await expect(usuariosService.verificarPermisoAlta()).resolves.toBeUndefined();
  });
});

describe("usuariosService.cambiarClave", () => {
  const propio = { idUsuario: 7n };

  it("la clave de otro usuario responde 403, no 401 (la sesion es valida)", async () => {
    await expect(usuariosService.cambiarClave(8n, { passwordActual: "clave-actual", passwordNueva: "clave-nueva-1" }, propio))
      .rejects.toBeInstanceOf(ErrorProhibido);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("sin la clave actual o con una incorrecta responde 400, para que la web no cierre la sesion", async () => {
    repo.obtenerPorIdConClave.mockResolvedValue({ idUsuario: 7n, claveHash: await bcrypt.hash("clave-actual", 4) } as never);

    await expect(usuariosService.cambiarClave(7n, { passwordNueva: "clave-nueva-1" }, propio)).rejects.toBeInstanceOf(
      ErrorValidacion
    );
    await expect(
      usuariosService.cambiarClave(7n, { passwordActual: "otra-clave", passwordNueva: "clave-nueva-1" }, propio)
    ).rejects.toMatchObject({ statusCode: 400, message: "La clave actual no es correcta: revisala y volve a intentar" });
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("con la clave actual correcta guarda la nueva hasheada", async () => {
    repo.obtenerPorIdConClave.mockResolvedValue({ idUsuario: 7n, claveHash: await bcrypt.hash("clave-actual", 4) } as never);

    await usuariosService.cambiarClave(7n, { passwordActual: "clave-actual", passwordNueva: "clave-nueva-1" }, propio);

    const guardado = repo.actualizar.mock.calls[0][2] as { claveHash: string };
    expect(await bcrypt.compare("clave-nueva-1", guardado.claveHash)).toBe(true);
  });
});
