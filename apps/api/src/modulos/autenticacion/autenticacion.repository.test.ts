import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma";

import { autenticacionRepository } from "./autenticacion.repository";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    intentoLogin: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() }
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
