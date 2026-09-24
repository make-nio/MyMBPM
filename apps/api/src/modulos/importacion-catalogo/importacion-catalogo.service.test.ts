import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";

import { importacionCatalogoRepository } from "./importacion-catalogo.repository";
import { importacionCatalogoService } from "./importacion-catalogo.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("../auditoria/auditoria.service", () => ({ auditoriaService: { registrarAltas: vi.fn() } }));
vi.mock("./importacion-catalogo.repository", () => ({
  importacionCatalogoRepository: {
    bloquearImportacion: vi.fn(),
    buscarExistentes: vi.fn(),
    buscarCategoriasPorSlug: vi.fn(),
    crearCategoria: vi.fn(),
    crearItems: vi.fn()
  }
}));

const repo = vi.mocked(importacionCatalogoRepository);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (cliente: typeof tx) => unknown) => fn(tx)) as never);
  repo.buscarExistentes.mockResolvedValue({
    items: [],
    porCodigo: [],
    categorias: [{ idCategoria: 5n, nombre: "Velas", slug: "velas" }]
  } as never);
  repo.buscarCategoriasPorSlug.mockResolvedValue([{ slug: "macetas" }] as never);
  repo.crearCategoria.mockResolvedValue({ idCategoria: 9n } as never);
  repo.crearItems.mockImplementation((async (_tx: unknown, datos: Array<Record<string, unknown>>) =>
    datos.map((dato, indice) => ({ ...dato, idItemCatalogo: 100n + BigInt(indice) }))) as never);
});

const filas = [
  { nombre: "Vela lavanda", tipo: "Producto", categoria: "velas", precio: "1000" },
  { nombre: "Maceta", tipo: "Producto", categoria: "Macetas" }
];

describe("importacionCatalogoService.previsualizar", () => {
  it("valida contra la base sin escribir", async () => {
    const { resumen } = await importacionCatalogoService.previsualizar(filas);

    expect(resumen).toEqual({ total: 2, validas: 2, conErrores: 0, categoriasNuevas: ["Macetas"] });
    expect(repo.buscarExistentes).toHaveBeenCalledWith(prisma, ["vela-lavanda", "maceta"], [], ["velas", "Macetas"]);
    expect(repo.crearItems).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("importacionCatalogoService.importar", () => {
  it("toma el lock, crea las categorias nuevas (con slug libre) y los items, y audita cada alta", async () => {
    const resultado = await importacionCatalogoService.importar(filas, 7n);

    expect(repo.bloquearImportacion).toHaveBeenCalledWith(tx);
    // "macetas" ya lo usa otra categoria: se usa "macetas-2".
    expect(repo.crearCategoria).toHaveBeenCalledWith(tx, { nombre: "Macetas", slug: "macetas-2" });
    // Todos los items en una sola consulta, y todas las altas de auditoria en otra.
    expect(repo.crearItems).toHaveBeenCalledTimes(1);
    expect(repo.crearItems).toHaveBeenCalledWith(tx, [
      expect.objectContaining({ nombre: "Vela lavanda", idCategoria: 5n, precio: 1000 }),
      expect.objectContaining({ nombre: "Maceta", idCategoria: 9n })
    ]);
    expect(auditoriaService.registrarAltas).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ entidad: "ITEM_CATALOGO", idUsuario: 7n }),
      [
        expect.objectContaining({ idEntidad: 100n, registro: expect.objectContaining({ nombre: "Vela lavanda" }) }),
        expect.objectContaining({ idEntidad: 101n })
      ]
    );
    expect(resultado).toEqual({ creados: 2, categoriasCreadas: ["Macetas"] });
  });

  it("si alguna fila tiene errores no crea nada y devuelve las filas con error", async () => {
    const importacion = importacionCatalogoService.importar([...filas, { nombre: "Sin tipo", categoria: "Velas" }]);

    await expect(importacion).rejects.toBeInstanceOf(ErrorConflicto);
    await expect(importacion).rejects.toMatchObject({
      message: "Hay 1 fila con errores: no se importo nada",
      detalles: { filas: [expect.objectContaining({ numero: 4 })] }
    });
    expect(repo.crearCategoria).not.toHaveBeenCalled();
    expect(repo.crearItems).not.toHaveBeenCalled();
  });
});
