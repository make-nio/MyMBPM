import { describe, expect, it, vi } from "vitest";

import { cargarHasta, cargarPagina, cargarTodo, LIMITE_API, partirPagina, TAMANO_PAGINA } from "./paginacion";

// Simula la API: `total` filas numeradas, respetando limit y offset.
function api(total: number) {
  return vi.fn(async (limit: number, offset: number) => {
    expect(limit).toBeLessThanOrEqual(LIMITE_API);
    return Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => offset + i);
  });
}

describe("partirPagina", () => {
  it("la fila de mas indica que hay mas resultados y no se muestra", () => {
    expect(partirPagina([1, 2, 3], 2)).toEqual({ items: [1, 2], hayMas: true });
    expect(partirPagina([1, 2], 2)).toEqual({ items: [1, 2], hayMas: false });
  });
});

describe("cargarPagina", () => {
  it("pide una fila de mas desde el offset", async () => {
    const cargar = api(120);

    const pagina = await cargarPagina(cargar, 50);

    expect(cargar).toHaveBeenCalledWith(TAMANO_PAGINA + 1, 50);
    expect(pagina.items).toHaveLength(TAMANO_PAGINA);
    expect(pagina.hayMas).toBe(true);
  });

  it("en la ultima pagina ya no hay mas", async () => {
    const pagina = await cargarPagina(api(120), 100);

    expect(pagina).toEqual({ items: Array.from({ length: 20 }, (_, i) => 100 + i), hayMas: false });
  });
});

describe("cargarHasta", () => {
  it("recarga todo lo que ya se veia, en tandas que la API acepta", async () => {
    const cargar = api(300);

    const pagina = await cargarHasta(cargar, 150);

    expect(pagina.items).toEqual(Array.from({ length: 150 }, (_, i) => i));
    expect(pagina.hayMas).toBe(true);
    expect(cargar.mock.calls).toEqual([
      [100, 0],
      [52, 99]
    ]);
  });

  it("como minimo trae una pagina y corta cuando no hay mas", async () => {
    const cargar = api(10);

    expect(await cargarHasta(cargar, 0)).toEqual({ items: Array.from({ length: 10 }, (_, i) => i), hayMas: false });
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});

describe("cargarTodo", () => {
  it("pide tandas del tope de la API hasta que una viene incompleta", async () => {
    const filas = Array.from({ length: 2 * LIMITE_API + 7 }, (_, indice) => indice);
    const cargar = vi.fn(async (limit: number, offset: number) => filas.slice(offset, offset + limit));

    expect(await cargarTodo(cargar)).toEqual(filas);
    expect(cargar.mock.calls).toEqual([
      [LIMITE_API, 0],
      [LIMITE_API, LIMITE_API],
      [LIMITE_API, 2 * LIMITE_API]
    ]);
  });

  it("con un multiplo exacto del tope termina con una tanda vacia", async () => {
    const filas = Array.from({ length: LIMITE_API }, (_, indice) => indice);
    const cargar = vi.fn(async (limit: number, offset: number) => filas.slice(offset, offset + limit));

    expect(await cargarTodo(cargar)).toHaveLength(LIMITE_API);
    expect(cargar).toHaveBeenCalledTimes(2);
  });
});
