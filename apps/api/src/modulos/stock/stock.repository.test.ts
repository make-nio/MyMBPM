import { describe, expect, it, vi } from "vitest";

import { stockRepository, usuarioDelMovimiento } from "./stock.repository";

describe("stockRepository.listarHistorial", () => {
  it("devuelve del usuario solo id, nombre y apellido, nunca claveHash", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const cliente = { estadoStock: { findMany } } as never;

    await stockRepository.listarHistorial(cliente, { idItemCatalogo: 1n, limit: 20, offset: 0 });

    expect(findMany.mock.calls[0][0].include).toEqual({ usuario: { select: usuarioDelMovimiento } });
    expect(Object.keys(usuarioDelMovimiento).sort()).toEqual(["apellido", "idUsuario", "nombre"]);
    expect(usuarioDelMovimiento).not.toHaveProperty("claveHash");
  });
});

describe("stockRepository.listarHistorial (filtro por origen)", () => {
  it("filtra por origen y referencia para ver los movimientos de un pedido u orden", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const cliente = { estadoStock: { findMany } } as never;

    await stockRepository.listarHistorial(cliente, {
      idItemCatalogo: 3n,
      tipoStock: "PRODUCTO",
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 42n,
      limit: 100,
      offset: 0
    });

    expect(findMany.mock.calls[0][0].where).toEqual({
      idItemCatalogo: 3n,
      tipoStock: "PRODUCTO",
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 42n
    });
  });
});

describe("stockRepository.listarUltimosMovimientos", () => {
  it("tampoco devuelve datos sensibles del usuario", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const cliente = { estadoStock: { findMany } } as never;

    await stockRepository.listarUltimosMovimientos(cliente, 5);

    expect(findMany.mock.calls[0][0].include.usuario).toEqual({ select: usuarioDelMovimiento });
    expect(findMany.mock.calls[0][0].take).toBe(5);
  });
});

describe("stockRepository.listarItemsParaExistencias", () => {
  it("busca por nombre o codigo y ordena de forma estable para paginar", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const cliente = { itemCatalogo: { findMany } } as never;

    await stockRepository.listarItemsParaExistencias(cliente, { activo: true, busqueda: "vela" });

    expect(findMany.mock.calls[0][0].where).toEqual({
      tipoItem: undefined,
      activo: true,
      OR: [
        { nombre: { contains: "vela", mode: "insensitive" } },
        { codigo: { contains: "vela", mode: "insensitive" } }
      ]
    });
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ tipoItem: "asc" }, { nombre: "asc" }, { idItemCatalogo: "asc" }]);
  });
});
