import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma";

import { autenticacionRepository } from "./autenticacion.repository";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    intentoLogin: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    sesionUsuario: { findUnique: vi.fn() }
  }
}));

const tablaFaltante = new Prisma.PrismaClientKnownRequestError("The table INTENTO_LOGIN does not exist", {
  code: "P2021",
  clientVersion: "prueba"
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("autenticacionRepository sin la tabla INTENTO_LOGIN (deploy preview antes de migrar)", () => {
  it("no hay fallidos y el ingreso sigue", async () => {
    vi.mocked(prisma.intentoLogin.findMany).mockRejectedValue(tablaFaltante);

    await expect(autenticacionRepository.listarFallidosRecientes("usuario:1", new Date(), 5)).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("registrar y limpiar no fallan", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(tablaFaltante);
    vi.mocked(prisma.intentoLogin.deleteMany).mockRejectedValue(tablaFaltante);

    await expect(autenticacionRepository.registrarFallidos(["usuario:1"], new Date())).resolves.toBeUndefined();
    await expect(autenticacionRepository.limpiarFallidos(["usuario:1"])).resolves.toBeUndefined();
  });

  it("cualquier otro error de la base se propaga", async () => {
    vi.mocked(prisma.intentoLogin.findMany).mockRejectedValue(new Error("conexion caida"));

    await expect(autenticacionRepository.listarFallidosRecientes("usuario:1", new Date(), 5)).rejects.toThrow(
      "conexion caida"
    );
  });
});

describe("autenticacionRepository.listarFallidosRecientes", () => {
  it("trae solo las fechas, de la mas nueva a la mas vieja, hasta el maximo", async () => {
    const fecha = new Date();
    vi.mocked(prisma.intentoLogin.findMany).mockResolvedValue([{ fecha }] as never);

    await expect(autenticacionRepository.listarFallidosRecientes("ip:1.1.1.1", fecha, 20)).resolves.toEqual([fecha]);
    expect(vi.mocked(prisma.intentoLogin.findMany).mock.calls[0][0]).toMatchObject({
      where: { clave: "ip:1.1.1.1", fecha: { gte: fecha } },
      orderBy: { fecha: "desc" },
      take: 20
    });
  });
});

describe("autenticacionRepository.registrarFallidos (limpieza)", () => {
  it("en la misma transaccion registra los fallidos y borra los de cualquier clave anteriores al corte", async () => {
    const corte = new Date("2026-09-23T12:00:00Z");
    vi.mocked(prisma.intentoLogin.createMany).mockReturnValue("alta" as never);
    vi.mocked(prisma.intentoLogin.deleteMany).mockReturnValue("limpieza" as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await autenticacionRepository.registrarFallidos(["usuario:7", "ip:203.0.113.9"], corte);

    expect(prisma.intentoLogin.createMany).toHaveBeenCalledWith({
      data: [{ clave: "usuario:7" }, { clave: "ip:203.0.113.9" }]
    });
    // Sin filtro por clave: cada fallido limpia la tabla entera, asi no crece para siempre.
    expect(prisma.intentoLogin.deleteMany).toHaveBeenCalledWith({ where: { fecha: { lt: corte } } });
    expect(prisma.$transaction).toHaveBeenCalledWith(["alta", "limpieza"]);
  });
});

describe("autenticacionRepository.obtenerSesionesValidasDesde", () => {
  it("devuelve el corte del usuario, o null si no tiene", async () => {
    const desde = new Date("2026-09-24T10:00:00Z");
    vi.mocked(prisma.sesionUsuario.findUnique).mockResolvedValueOnce({ validasDesde: desde } as never);
    vi.mocked(prisma.sesionUsuario.findUnique).mockResolvedValueOnce(null);

    await expect(autenticacionRepository.obtenerSesionesValidasDesde(1n)).resolves.toEqual(desde);
    await expect(autenticacionRepository.obtenerSesionesValidasDesde(2n)).resolves.toBeNull();
  });

  it("sin la tabla USUARIO_SESION (deploy preview antes de migrar) no hay cortes", async () => {
    vi.mocked(prisma.sesionUsuario.findUnique).mockRejectedValue(tablaFaltante);

    await expect(autenticacionRepository.obtenerSesionesValidasDesde(1n)).resolves.toBeNull();
  });

  it("otros errores de la base se propagan", async () => {
    vi.mocked(prisma.sesionUsuario.findUnique).mockRejectedValue(new Error("conexion caida"));

    await expect(autenticacionRepository.obtenerSesionesValidasDesde(1n)).rejects.toThrow("conexion caida");
  });
});
