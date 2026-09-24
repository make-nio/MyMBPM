import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";

import { prisma } from "../../lib/prisma";

import { stockRepository } from "./stock.repository";
import { stockService } from "./stock.service";

vi.mock("./stock.repository", () => ({
  stockRepository: {
    obtenerUltimoEstado: vi.fn(),
    listarHistorial: vi.fn(),
    buscarMovimientoDuplicado: vi.fn(),
    crearMovimiento: vi.fn(),
    obtenerItem: vi.fn(),
    listarItemsParaExistencias: vi.fn(),
    listarUltimosEstados: vi.fn(),
    bloquearItem: vi.fn()
  }
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

const repo = vi.mocked(stockRepository);
// El service solo reenvia el cliente/tx al repository, que esta mockeado.
const tx = {} as Prisma.TransactionClient;
const dec = (value: number | string) => new Prisma.Decimal(value);

function ultimoEstado(stockActual: number | string) {
  return { stockActual: dec(stockActual) } as Awaited<ReturnType<typeof stockRepository.obtenerUltimoEstado>>;
}

function movimientoCreado() {
  return repo.crearMovimiento.mock.calls[0][1];
}

beforeEach(() => {
  vi.resetAllMocks();
  repo.obtenerItem.mockResolvedValue({ idItemCatalogo: 1n } as never);
  repo.buscarMovimientoDuplicado.mockResolvedValue(null);
  repo.obtenerUltimoEstado.mockResolvedValue(null);
  repo.crearMovimiento.mockImplementation(((_tx: unknown, input: unknown) => Promise.resolve(input)) as never);
});

describe("stockService.obtenerStockActual", () => {
  it("devuelve 0 cuando el item no tiene movimientos", async () => {
    const stock = await stockService.obtenerStockActual(tx, 1n, "PRODUCTO");

    expect(stock.stockActual.toString()).toBe("0");
    expect(stock.ultimoMovimiento).toBeNull();
  });

  it("toma el stock del ultimo estado registrado", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado("7.5"));

    const stock = await stockService.obtenerStockActual(tx, 1n, "INSUMO");

    expect(stock.stockActual.toString()).toBe("7.5");
    expect(repo.obtenerUltimoEstado).toHaveBeenCalledWith(tx, 1n, "INSUMO");
  });
});

describe("stockService.registrarIngreso", () => {
  it("falla si el item no existe", async () => {
    repo.obtenerItem.mockResolvedValue(null);

    await expect(
      stockService.registrarIngreso(tx, {
        idItemCatalogo: 99n,
        tipoStock: "PRODUCTO",
        tipoMovimiento: "INGRESO_PRODUCCION",
        cantidad: 1,
        origenMovimiento: "PRODUCCION"
      })
    ).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repo.crearMovimiento).not.toHaveBeenCalled();
  });

  it("suma al stock anterior con precision decimal", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado("0.1"));

    await stockService.registrarIngreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "INSUMO",
      tipoMovimiento: "AJUSTE_POSITIVO",
      cantidad: 0.2,
      origenMovimiento: "MANUAL"
    });

    const movimiento = movimientoCreado();
    expect(movimiento.stockAnterior.toString()).toBe("0.1");
    expect(movimiento.stockActual.toString()).toBe("0.3");
    expect(movimiento.cantidadMovimiento.toString()).toBe("0.2");
  });

  it("es idempotente: si ya existe el movimiento no inserta otro", async () => {
    const existente = { idEstadoStock: 10n };
    repo.buscarMovimientoDuplicado.mockResolvedValue(existente as never);

    const resultado = await stockService.registrarIngreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "INGRESO_PRODUCCION",
      cantidad: 4,
      origenMovimiento: "PRODUCCION",
      idReferenciaOrigen: 5n,
      idReferenciaDetalle: 6n
    });

    expect(resultado).toBe(existente);
    expect(repo.buscarMovimientoDuplicado).toHaveBeenCalledWith(tx, {
      origenMovimiento: "PRODUCCION",
      idReferenciaOrigen: 5n,
      idReferenciaDetalle: 6n,
      idItemCatalogo: 1n,
      tipoMovimiento: "INGRESO_PRODUCCION"
    });
    expect(repo.crearMovimiento).not.toHaveBeenCalled();
  });

  it("no aplica idempotencia a movimientos manuales", async () => {
    await stockService.registrarIngreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "AJUSTE_POSITIVO",
      cantidad: 1,
      origenMovimiento: "MANUAL"
    });

    expect(repo.buscarMovimientoDuplicado).not.toHaveBeenCalled();
    expect(repo.crearMovimiento).toHaveBeenCalledTimes(1);
  });
});

describe("stockService.registrarEgreso", () => {
  it("rechaza el egreso si no hay stock suficiente", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado(2));

    const egreso = stockService.registrarEgreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "EGRESO_PEDIDO",
      cantidad: 3,
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 1n,
      idReferenciaDetalle: 1n
    });

    await expect(egreso).rejects.toBeInstanceOf(ErrorConflicto);
    await expect(egreso).rejects.toMatchObject({
      detalles: { idItemCatalogo: "1", stockActual: "2", cantidadSolicitada: "3" }
    });
    expect(repo.crearMovimiento).not.toHaveBeenCalled();
  });

  it("permite dejar el stock exactamente en cero", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado(3));

    await stockService.registrarEgreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "EGRESO_PEDIDO",
      cantidad: dec(3),
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 1n,
      idReferenciaDetalle: 1n
    });

    const movimiento = movimientoCreado();
    expect(movimiento.stockAnterior.toString()).toBe("3");
    expect(movimiento.stockActual.toString()).toBe("0");
    expect(movimiento.tipoMovimiento).toBe("EGRESO_PEDIDO");
  });

  it("devuelve el movimiento existente sin revalidar stock si es un reintento", async () => {
    const existente = { idEstadoStock: 3n };
    repo.buscarMovimientoDuplicado.mockResolvedValue(existente as never);
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado(0));

    const resultado = await stockService.registrarEgreso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "EGRESO_PEDIDO",
      cantidad: 3,
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 1n,
      idReferenciaDetalle: 1n
    });

    expect(resultado).toBe(existente);
    expect(repo.crearMovimiento).not.toHaveBeenCalled();
  });
});

describe("stockService.registrarAjusteManual", () => {
  it("un AJUSTE_NEGATIVO es un egreso manual y valida stock", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado(1));

    await expect(
      stockService.registrarAjusteManual(tx, {
        idItemCatalogo: 1n,
        tipoStock: "INSUMO",
        tipoMovimiento: "AJUSTE_NEGATIVO",
        cantidad: 2
      })
    ).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("un AJUSTE_POSITIVO es un ingreso con origen MANUAL", async () => {
    await stockService.registrarAjusteManual(tx, {
      idItemCatalogo: 1n,
      idUsuario: 9n,
      tipoStock: "INSUMO",
      tipoMovimiento: "AJUSTE_POSITIVO",
      cantidad: 5
    });

    expect(movimientoCreado()).toMatchObject({
      idUsuario: 9n,
      origenMovimiento: "MANUAL",
      tipoMovimiento: "AJUSTE_POSITIVO"
    });
    expect(movimientoCreado().stockActual.toString()).toBe("5");
  });

  it("rechaza otros tipos de movimiento", () => {
    expect(() =>
      stockService.registrarAjusteManual(tx, {
        idItemCatalogo: 1n,
        tipoStock: "INSUMO",
        tipoMovimiento: "EGRESO_PEDIDO" as never,
        cantidad: 1
      })
    ).toThrow(ErrorConflicto);
  });
});

describe("stockService.registrarReverso", () => {
  it("registra un ingreso con tipo REVERSO", async () => {
    repo.obtenerUltimoEstado.mockResolvedValue(ultimoEstado(1));

    await stockService.registrarReverso(tx, {
      idItemCatalogo: 1n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "EGRESO_PEDIDO",
      cantidad: 2,
      origenMovimiento: "PEDIDO",
      idReferenciaOrigen: 1n,
      idReferenciaDetalle: 1n
    });

    expect(movimientoCreado().tipoMovimiento).toBe("REVERSO");
    expect(movimientoCreado().stockActual.toString()).toBe("3");
  });
});

describe("stockService.obtenerExistencias y obtenerBajoStock", () => {
  const item = (idItemCatalogo: bigint, nombre: string, tipoItem: "PRODUCTO" | "INSUMO", stockMinimo: number) =>
    ({ idItemCatalogo, nombre, tipoItem, stockMinimo, activo: true, categoria: { nombre: "Cat" } }) as never;
  const estado = (idItemCatalogo: bigint, tipoStock: string, stockActual: number) => ({
    idItemCatalogo,
    tipoStock,
    stockActual: dec(stockActual),
    fechaAlta: new Date("2026-09-24T00:00:00Z")
  });

  beforeEach(() => {
    repo.listarItemsParaExistencias.mockResolvedValue([
      item(1n, "Vela", "PRODUCTO", 5),
      item(2n, "Cera", "INSUMO", 3),
      item(3n, "Maceta", "PRODUCTO", 0),
      item(4n, "Nuevo", "PRODUCTO", 1)
    ]);
    repo.listarUltimosEstados.mockResolvedValue([
      estado(1n, "PRODUCTO", 2),
      // Un insumo se mide contra su stock de INSUMO, no de PRODUCTO.
      estado(2n, "INSUMO", 10),
      estado(2n, "PRODUCTO", 0),
      estado(3n, "PRODUCTO", 0)
    ]);
  });

  it("toma el stock del tipo que corresponde a cada item y 0 si no tiene movimientos", async () => {
    const existencias = await stockService.obtenerExistencias(tx, {});

    expect(existencias.map((e) => [e.nombre, e.tipoStock, e.stockActual.toString(), e.bajoMinimo])).toEqual([
      ["Vela", "PRODUCTO", "2", true],
      ["Cera", "INSUMO", "10", false],
      ["Maceta", "PRODUCTO", "0", false],
      ["Nuevo", "PRODUCTO", "0", true]
    ]);
    expect(repo.listarUltimosEstados).toHaveBeenCalledWith(tx, [1n, 2n, 3n, 4n]);
  });

  it("bajo stock no marca a un insumo con stock suficiente (antes se media contra PRODUCTO)", async () => {
    const bajos = await stockService.obtenerBajoStock(tx, { limit: 20, offset: 0 });

    expect(bajos.map((e) => e.nombre)).toEqual(["Vela", "Nuevo"]);
  });

  it("pagina despues de filtrar", async () => {
    const segundaPagina = await stockService.obtenerBajoStock(tx, { limit: 1, offset: 1 });

    expect(segundaPagina.map((e) => e.nombre)).toEqual(["Nuevo"]);
  });
});

describe("stockService: bloqueo y transaccion", () => {
  it("bloquea el item y tipo de stock antes de leer el stock anterior", async () => {
    await stockService.registrarEgreso(tx, {
      idItemCatalogo: 7n,
      tipoStock: "INSUMO",
      tipoMovimiento: "AJUSTE_NEGATIVO",
      cantidad: 0,
      origenMovimiento: "MANUAL"
    });

    expect(repo.bloquearItem).toHaveBeenCalledWith(tx, 7n, "INSUMO");
    expect(repo.bloquearItem.mock.invocationCallOrder[0]).toBeLessThan(
      repo.obtenerUltimoEstado.mock.invocationCallOrder[0]
    );
  });

  it("el ajuste manual corre dentro de una transaccion", async () => {
    const transaccion = { esTransaccion: true };
    vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
      callback(transaccion)) as never);

    await stockService.crearAjusteManual({
      idItemCatalogo: 1n,
      idUsuario: 3n,
      tipoStock: "PRODUCTO",
      tipoMovimiento: "AJUSTE_POSITIVO",
      cantidad: 2
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(repo.crearMovimiento).toHaveBeenCalledWith(
      transaccion,
      expect.objectContaining({ idUsuario: 3n, origenMovimiento: "MANUAL", tipoMovimiento: "AJUSTE_POSITIVO" })
    );
  });
});
