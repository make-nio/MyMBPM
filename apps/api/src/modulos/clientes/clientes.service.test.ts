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
  clientesRepository: { listar: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn() }
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
