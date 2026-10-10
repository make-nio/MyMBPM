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

describe("clientesService: segmento (#100)", () => {
  it("el alta guarda el segmento elegido y lo deja en el historial", async () => {
    const creado = { idCliente: 4n, nombre: "Pesca Sur", segmento: "COMERCIO" } as never;
    repo.crear.mockResolvedValue(creado);

    await clientesService.crear({ nombre: "Pesca Sur", segmento: "COMERCIO" }, 8n);

    expect(repo.crear).toHaveBeenCalledWith({ nombre: "Pesca Sur", segmento: "COMERCIO" }, tx);
    expect(auditoria.registrarAlta).toHaveBeenCalledWith(tx, expect.objectContaining({ campos: CAMPOS_AUDITADOS_CLIENTE }), creado);
  });

  it("el cambio de segmento queda en el historial de cambios con el valor anterior y el nuevo", async () => {
    const antes = { idCliente: 3n, segmento: "CONSUMIDOR" } as never;
    const despues = { idCliente: 3n, segmento: "REVENDEDOR" } as never;
    repo.obtenerPorId.mockResolvedValue(antes);
    repo.actualizar.mockResolvedValue(despues);

    await clientesService.actualizar(3n, { segmento: "REVENDEDOR" }, 8n);

    expect(CAMPOS_AUDITADOS_CLIENTE).toContain("segmento");
    expect(auditoria.registrarModificacion).toHaveBeenCalledWith(
      tx,
      { entidad: "CLIENTE", idEntidad: 3n, idUsuario: 8n, campos: CAMPOS_AUDITADOS_CLIENTE },
      antes,
      despues
    );
  });

  it("la lista pasa el filtro por segmento al repository", async () => {
    repo.listar.mockResolvedValue([]);

    await clientesService.listar({ segmento: "COMERCIO", limit: 50, offset: 0 });

    expect(repo.listar).toHaveBeenCalledWith({ segmento: "COMERCIO", limit: 50, offset: 0 });
  });
});
