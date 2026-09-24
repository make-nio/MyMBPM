import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma";

import { auditoriaRepository, olvidarTablaAuditoria } from "./auditoria.repository";

vi.mock("../../lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn(), auditoriaCambio: { create: vi.fn(), findMany: vi.fn() } }
}));

const tx = { auditoriaCambio: { create: vi.fn() } };
const registro = { entidad: "CLIENTE" as const, idEntidad: 3n, accion: "ALTA" as const, cambios: [], idUsuario: 8n };

beforeEach(() => {
  vi.resetAllMocks();
  olvidarTablaAuditoria();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("auditoriaRepository con la tabla", () => {
  it("registra en la transaccion recibida y pregunta por la tabla una sola vez", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ existe: true }] as never);

    await auditoriaRepository.registrar(tx as never, registro);
    await auditoriaRepository.registrar(tx as never, registro);

    expect(tx.auditoriaCambio.create).toHaveBeenCalledTimes(2);
    expect(tx.auditoriaCambio.create).toHaveBeenCalledWith({ data: registro });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("lista sin datos sensibles del usuario", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ existe: true }] as never);
    vi.mocked(prisma.auditoriaCambio.findMany).mockResolvedValue([]);

    await auditoriaRepository.listar({ entidad: "CLIENTE", idEntidad: 3n, limit: 20, offset: 0 });

    expect(vi.mocked(prisma.auditoriaCambio.findMany).mock.calls[0][0]).toMatchObject({
      where: { entidad: "CLIENTE", idEntidad: 3n },
      include: { usuario: { select: { idUsuario: true, nombre: true, apellido: true } } }
    });
  });
});

describe("auditoriaRepository sin la tabla (deploy preview antes de migrar)", () => {
  it("no intenta el INSERT, que abortaria la transaccion del cambio", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ existe: false }] as never);

    await expect(auditoriaRepository.registrar(tx as never, registro)).resolves.toBeNull();
    expect(tx.auditoriaCambio.create).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("el historial viene vacio", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ existe: false }] as never);

    await expect(auditoriaRepository.listar({ entidad: "CLIENTE", idEntidad: 3n, limit: 20, offset: 0 })).resolves.toEqual([]);
    expect(prisma.auditoriaCambio.findMany).not.toHaveBeenCalled();
  });

  it("si la consulta falla, la proxima vez vuelve a preguntar", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("conexion caida")).mockResolvedValue([{ existe: true }] as never);

    await expect(auditoriaRepository.registrar(tx as never, registro)).rejects.toThrow("conexion caida");
    await auditoriaRepository.registrar(tx as never, registro);

    expect(tx.auditoriaCambio.create).toHaveBeenCalledTimes(1);
  });
});
