import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";

import { itemsCatalogoRepository } from "./items-catalogo.repository";
import { CAMPOS_AUDITADOS_ITEM, itemsCatalogoService } from "./items-catalogo.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: { $transaction: vi.fn(), categoria: { findUnique: vi.fn() } }
}));

vi.mock("../auditoria/auditoria.service", () => ({
  auditoriaService: { registrarAlta: vi.fn(), registrarModificacion: vi.fn() }
}));

vi.mock("./items-catalogo.repository", () => ({
  itemsCatalogoRepository: { obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn() }
}));

const repo = vi.mocked(itemsCatalogoRepository);
const auditoria = vi.mocked(auditoriaService);
const antes = { idItemCatalogo: 5n, precio: new Prisma.Decimal("100"), stockMinimo: 2, activo: true } as never;
const despues = { idItemCatalogo: 5n, precio: new Prisma.Decimal("120"), stockMinimo: 2, activo: true } as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
  vi.mocked(prisma.categoria.findUnique).mockResolvedValue({ idCategoria: 1n } as never);
});

describe("itemsCatalogoService: historial de cambios", () => {
  it("actualizar lee el antes y registra el cambio con el usuario, todo en la misma transaccion", async () => {
    repo.obtenerPorId.mockResolvedValue(antes);
    repo.actualizar.mockResolvedValue(despues);

    await itemsCatalogoService.actualizar(5n, { precio: 120 }, 8n);

    expect(repo.obtenerPorId).toHaveBeenCalledWith(5n, tx);
    expect(repo.actualizar).toHaveBeenCalledWith(5n, { precio: 120 }, tx);
    expect(auditoria.registrarModificacion).toHaveBeenCalledWith(
      tx,
      { entidad: "ITEM_CATALOGO", idEntidad: 5n, idUsuario: 8n, campos: CAMPOS_AUDITADOS_ITEM },
      antes,
      despues
    );
  });

  it("precio, costo y stock minimo estan entre los campos auditados", () => {
    expect(CAMPOS_AUDITADOS_ITEM).toEqual(expect.arrayContaining(["precio", "costo", "stockMinimo"]));
  });

  it("si el item no existe no actualiza ni registra", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(itemsCatalogoService.cambiarEstado(5n, false, 8n)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repo.actualizar).not.toHaveBeenCalled();
    expect(auditoria.registrarModificacion).not.toHaveBeenCalled();
  });

  it("el alta queda registrada", async () => {
    repo.crear.mockResolvedValue(despues);

    await itemsCatalogoService.crear(
      { idCategoria: 1n, tipoItem: "PRODUCTO", nombre: "Vela", slug: "vela", precio: 120 },
      8n
    );

    expect(auditoria.registrarAlta).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ entidad: "ITEM_CATALOGO", idEntidad: 5n, idUsuario: 8n }),
      despues
    );
  });
});
