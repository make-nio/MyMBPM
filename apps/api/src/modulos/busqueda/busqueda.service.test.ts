import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RESULTADOS_POR_GRUPO, buscarQuerySchema } from "./busqueda.schemas";
import { busquedaRepository } from "./busqueda.repository";
import { busquedaService } from "./busqueda.service";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

vi.mock("./busqueda.repository", () => ({
  busquedaRepository: {
    buscarPedidos: vi.fn(),
    buscarClientes: vi.fn(),
    buscarItems: vi.fn()
  }
}));

const repo = vi.mocked(busquedaRepository);

const item = {
  idItemCatalogo: 7n,
  nombre: "Maceta",
  tipoItem: "PRODUCTO",
  precio: new Prisma.Decimal(1500),
  costo: new Prisma.Decimal(400),
  activo: true,
  categoria: { nombre: "Hogar" }
};

beforeEach(() => {
  vi.resetAllMocks();
  repo.buscarPedidos.mockResolvedValue([{ idPedido: 1n, numeroPedido: "PED-000001" }] as never);
  repo.buscarClientes.mockResolvedValue([{ idCliente: 2n, nombre: "Ana" }] as never);
  repo.buscarItems.mockResolvedValue([item] as never);
});

describe("busquedaService.buscar", () => {
  it("busca en los tres grupos con el mismo texto y el mismo limite", async () => {
    const resultado = await busquedaService.buscar("mace", { verCostos: true });

    expect(repo.buscarPedidos).toHaveBeenCalledWith("mace", RESULTADOS_POR_GRUPO);
    expect(repo.buscarClientes).toHaveBeenCalledWith("mace", RESULTADOS_POR_GRUPO);
    expect(repo.buscarItems).toHaveBeenCalledWith("mace", RESULTADOS_POR_GRUPO);
    expect(resultado.pedidos).toHaveLength(1);
    expect(resultado.clientes).toHaveLength(1);
  });

  it("con permiso devuelve el costo del item y aplana la categoria", async () => {
    const { items } = await busquedaService.buscar("mace", { verCostos: true });

    expect(items).toEqual([
      {
        idItemCatalogo: 7n,
        nombre: "Maceta",
        tipoItem: "PRODUCTO",
        precio: new Prisma.Decimal(1500),
        costo: new Prisma.Decimal(400),
        activo: true,
        categoria: "Hogar"
      }
    ]);
  });

  it("sin permiso no incluye el costo", async () => {
    const { items } = await busquedaService.buscar("mace", { verCostos: false });

    expect(items[0]).not.toHaveProperty("costo");
    expect(items[0]).toMatchObject({ nombre: "Maceta", precio: new Prisma.Decimal(1500) });
  });
});

describe("buscarQuerySchema", () => {
  it("recorta espacios y pide al menos 2 caracteres", () => {
    expect(buscarQuerySchema.parse({ q: "  ped-1 " })).toEqual({ q: "ped-1" });
    expect(buscarQuerySchema.safeParse({ q: " a " }).success).toBe(false);
    expect(buscarQuerySchema.safeParse({}).success).toBe(false);
    expect(buscarQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});
