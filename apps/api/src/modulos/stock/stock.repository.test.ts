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
