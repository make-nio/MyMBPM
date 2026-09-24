import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";

import { clientesRepository } from "./clientes.repository";
import { CAMPOS_AUDITADOS_CLIENTE, clientesService } from "./clientes.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

vi.mock("../auditoria/auditoria.service", () => ({
  auditoriaService: { registrarAlta: vi.fn(), registrarModificacion: vi.fn() }
}));

vi.mock("./clientes.repository", () => ({
  clientesRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    resumenCompras: vi.fn()
  }
}));

const repo = vi.mocked(clientesRepository);
const auditoria = vi.mocked(auditoriaService);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
});

describe("clientesService: historial de cambios", () => {
  it("desactivar registra el cambio con el usuario en la misma transaccion", async () => {
    const antes = { idCliente: 3n, activo: true } as never;
    const despues = { idCliente: 3n, activo: false } as never;
    repo.obtenerPorId.mockResolvedValue(antes);
    repo.actualizar.mockResolvedValue(despues);

    await clientesService.cambiarEstado(3n, false, 8n);

    expect(repo.actualizar).toHaveBeenCalledWith(3n, { activo: false }, tx);
    expect(auditoria.registrarModificacion).toHaveBeenCalledWith(
      tx,
      { entidad: "CLIENTE", idEntidad: 3n, idUsuario: 8n, campos: CAMPOS_AUDITADOS_CLIENTE },
      antes,
      despues
    );
  });

  it("el alta queda registrada", async () => {
    const cliente = { idCliente: 3n, nombre: "Ana" } as never;
    repo.crear.mockResolvedValue(cliente);

    await clientesService.crear({ nombre: "Ana" }, 8n);

    expect(repo.crear).toHaveBeenCalledWith({ nombre: "Ana" }, tx);
    expect(auditoria.registrarAlta).toHaveBeenCalledWith(tx, expect.objectContaining({ entidad: "CLIENTE", idEntidad: 3n }), cliente);
  });
});

describe("clientesService.obtenerResumen", () => {
  it("devuelve lo comprado (vendido) del cliente", async () => {
    const ultima = new Date("2026-09-20T12:00:00Z");
    repo.obtenerPorId.mockResolvedValue({ idCliente: 3n } as never);
    repo.resumenCompras.mockResolvedValue({
      _sum: { total: new Prisma.Decimal("4500.50") },
      _count: { _all: 3 },
      _max: { fechaConfirmacion: ultima }
    } as never);

    const resumen = await clientesService.obtenerResumen(3n);

    expect(repo.resumenCompras).toHaveBeenCalledWith(3n);
    expect(resumen).toEqual({ totalComprado: new Prisma.Decimal("4500.50"), pedidosComprados: 3, fechaUltimaCompra: ultima });
  });

  it("sin compras devuelve cero, no null", async () => {
    repo.obtenerPorId.mockResolvedValue({ idCliente: 4n } as never);
    repo.resumenCompras.mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 }, _max: { fechaConfirmacion: null } } as never);

    const resumen = await clientesService.obtenerResumen(4n);

    expect(resumen.totalComprado.toString()).toBe("0");
    expect(resumen.pedidosComprados).toBe(0);
    expect(resumen.fechaUltimaCompra).toBeNull();
  });

  it("un cliente que no existe es 404 y no consulta pedidos", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(clientesService.obtenerResumen(99n)).rejects.toThrow("Cliente no encontrado");
    expect(repo.resumenCompras).not.toHaveBeenCalled();
  });
});
