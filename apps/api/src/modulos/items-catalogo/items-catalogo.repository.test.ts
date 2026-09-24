import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma";

import { itemsCatalogoRepository } from "./items-catalogo.repository";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    itemCatalogo: { findMany: vi.fn() }
  }
}));

const findMany = vi.mocked(prisma.itemCatalogo.findMany);

beforeEach(() => {
  vi.resetAllMocks();
  findMany.mockResolvedValue([]);
});

describe("itemsCatalogoRepository.listar", () => {
  it("busca por nombre o codigo sin distinguir mayusculas", async () => {
    await itemsCatalogoRepository.listar({ busqueda: "vela", tipoItem: "PRODUCTO", limit: 21, offset: 0 });

    const consulta = findMany.mock.calls[0][0]!;
    expect(consulta.where).toMatchObject({
      tipoItem: "PRODUCTO",
      OR: [
        { nombre: { contains: "vela", mode: "insensitive" } },
        { codigo: { contains: "vela", mode: "insensitive" } }
      ]
    });
    expect(consulta.take).toBe(21);
  });

  it("sin busqueda no filtra por texto", async () => {
    await itemsCatalogoRepository.listar({ limit: 51, offset: 50 });

    const consulta = findMany.mock.calls[0][0]!;
    expect(consulta.where).not.toHaveProperty("OR");
    expect(consulta.skip).toBe(50);
  });
});
