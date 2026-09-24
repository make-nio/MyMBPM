import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { produccionRepository } from "./produccion.repository";
import { produccionService } from "./produccion.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("../stock/stock.service", () => ({
  stockService: {
    registrarEgreso: vi.fn(),
    registrarIngreso: vi.fn()
  }
}));

vi.mock("./produccion.repository", () => ({
  produccionRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    agregarDetalle: vi.fn(),
    obtenerDetalle: vi.fn(),
    actualizarDetalle: vi.fn(),
    eliminarDetalle: vi.fn(),
    actualizar: vi.fn(),
    obtenerItemCatalogo: vi.fn(),
    obtenerComponentesActivos: vi.fn(),
    crearConsumos: vi.fn()
  }
}));

const repo = vi.mocked(produccionRepository);
const stock = vi.mocked(stockService);
const dec = (value: number | string) => new Prisma.Decimal(value);

type OrdenConDetalles = NonNullable<Awaited<ReturnType<typeof produccionRepository.obtenerPorId>>>;

function orden(overrides: Partial<OrdenConDetalles> = {}) {
  return {
    idOrdenProduccion: 1n,
    estadoProduccion: "PENDIENTE",
    detalles: [],
    consumos: [],
    ...overrides
  } as OrdenConDetalles;
}

function detalle(idOrdenProduccionDetalle: bigint, idItemCatalogoProducto: bigint, cantidad: number) {
  return {
    idOrdenProduccionDetalle,
    idOrdenProduccion: 1n,
    idItemCatalogoProducto,
    cantidad: dec(cantidad),
    itemCatalogoProducto: { nombre: `Producto ${idItemCatalogoProducto}` }
  } as OrdenConDetalles["detalles"][number];
}

function componente(idItemCatalogoHijo: bigint, cantidadRequerida: number | string) {
  return { idItemCatalogoHijo, cantidadRequerida: dec(cantidadRequerida) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
});

describe("produccionService.agregarDetalle", () => {
  it("solo permite producir items de tipo PRODUCTO", async () => {
    repo.obtenerPorId.mockResolvedValue(orden());
    repo.obtenerItemCatalogo.mockResolvedValue({ idItemCatalogo: 5n, tipoItem: "INSUMO" } as never);

    await expect(
      produccionService.agregarDetalle(1n, { idItemCatalogoProducto: 5n, cantidad: 1 })
    ).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.agregarDetalle).not.toHaveBeenCalled();
  });

  it("solo permite agregar detalles a ordenes pendientes", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ estadoProduccion: "EN_PROCESO" }));

    await expect(
      produccionService.agregarDetalle(1n, { idItemCatalogoProducto: 5n, cantidad: 1 })
    ).rejects.toBeInstanceOf(ErrorConflicto);
  });
});

describe("produccionService.actualizarEstado (transiciones)", () => {
  it.each([
    ["EN_PROCESO", "PENDIENTE"],
    ["FINALIZADA", "PENDIENTE"],
    ["FINALIZADA", "CANCELADA"],
    ["CANCELADA", "PENDIENTE"]
  ] as const)("rechaza %s -> %s", async (actual, nuevo) => {
    repo.obtenerPorId.mockResolvedValue(orden({ estadoProduccion: actual }));

    await expect(produccionService.actualizarEstado(1n, { estadoProduccion: nuevo })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it.each(["PENDIENTE", "EN_PROCESO"] as const)("permite cancelar una orden %s", async (actual) => {
    repo.obtenerPorId.mockResolvedValue(orden({ estadoProduccion: actual }));

    await produccionService.actualizarEstado(1n, { estadoProduccion: "CANCELADA" });

    expect(repo.actualizar).toHaveBeenCalledWith(prisma, 1n, { estadoProduccion: "CANCELADA" });
  });

  it("permite actualizar observaciones sin cambiar el estado", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ estadoProduccion: "CANCELADA" }));

    await produccionService.actualizarEstado(1n, { estadoProduccion: "CANCELADA", observaciones: "sin filamento" });

    expect(repo.actualizar).toHaveBeenCalled();
  });
});

describe("produccionService.actualizarEstado", () => {
  it.each(["EN_PROCESO", "FINALIZADA"] as const)("no permite pasar a %s por el endpoint generico", async (estado) => {
    repo.obtenerPorId.mockResolvedValue(orden());

    await expect(produccionService.actualizarEstado(1n, { estadoProduccion: estado })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("produccionService.iniciar", () => {
  it("falla si la orden no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(produccionService.iniciar(1n)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("solo inicia ordenes pendientes con detalles", async () => {
    repo.obtenerPorId.mockResolvedValueOnce(orden({ estadoProduccion: "FINALIZADA", detalles: [detalle(1n, 2n, 1)] }));
    await expect(produccionService.iniciar(1n)).rejects.toBeInstanceOf(ErrorConflicto);

    repo.obtenerPorId.mockResolvedValueOnce(orden());
    await expect(produccionService.iniciar(1n)).rejects.toBeInstanceOf(ErrorConflicto);

    expect(stock.registrarEgreso).not.toHaveBeenCalled();
  });

  it("falla si un producto no tiene componentes activos", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ detalles: [detalle(1n, 2n, 1)] }));
    repo.obtenerComponentesActivos.mockResolvedValue([]);

    await expect(produccionService.iniciar(1n)).rejects.toThrow(/no tiene componentes activos/);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("consume insumos segun la receta, registra consumos y pasa a EN_PROCESO", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ detalles: [detalle(21n, 2n, 4), detalle(22n, 3n, 2)] }));
    repo.obtenerComponentesActivos
      .mockResolvedValueOnce([componente(10n, "1.5"), componente(11n, 2)] as never)
      .mockResolvedValueOnce([componente(10n, "0.25")] as never);

    await produccionService.iniciar(1n, 8n);

    expect(stock.registrarEgreso).toHaveBeenCalledTimes(3);
    expect(stock.registrarEgreso).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        idItemCatalogo: 10n,
        idUsuario: 8n,
        tipoStock: "INSUMO",
        tipoMovimiento: "EGRESO_PRODUCCION",
        origenMovimiento: "PRODUCCION",
        idReferenciaOrigen: 1n,
        idReferenciaDetalle: 21n
      })
    );
    const cantidades = stock.registrarEgreso.mock.calls.map(([, input]) => input.cantidad.toString());
    expect(cantidades).toEqual(["6", "8", "0.5"]);

    const consumos = repo.crearConsumos.mock.calls[0][1];
    expect(consumos.map((consumo) => [consumo.idItemCatalogoInsumo, consumo.cantidad.toString()])).toEqual([
      [10n, "6"],
      [11n, "8"],
      [10n, "0.5"]
    ]);
    expect(repo.actualizar).toHaveBeenCalledWith(
      tx,
      1n,
      expect.objectContaining({ estadoProduccion: "EN_PROCESO", fechaInicio: expect.any(Date) })
    );
  });

  it("no cambia el estado si falta insumo", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ detalles: [detalle(21n, 2n, 4)] }));
    repo.obtenerComponentesActivos.mockResolvedValue([componente(10n, 1)] as never);
    stock.registrarEgreso.mockRejectedValue(new ErrorConflicto("Stock insuficiente para realizar la operacion"));

    await expect(produccionService.iniciar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.crearConsumos).not.toHaveBeenCalled();
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("produccionService.finalizar", () => {
  it("solo finaliza ordenes en proceso", async () => {
    repo.obtenerPorId.mockResolvedValue(orden({ estadoProduccion: "PENDIENTE" }));

    await expect(produccionService.finalizar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(stock.registrarIngreso).not.toHaveBeenCalled();
  });

  it("ingresa stock de producto por detalle y pasa a FINALIZADA", async () => {
    repo.obtenerPorId.mockResolvedValue(
      orden({ estadoProduccion: "EN_PROCESO", detalles: [detalle(21n, 2n, 4), detalle(22n, 3n, 2)] })
    );

    await produccionService.finalizar(1n, 8n);

    expect(stock.registrarIngreso).toHaveBeenCalledTimes(2);
    expect(stock.registrarIngreso).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        idItemCatalogo: 3n,
        idUsuario: 8n,
        tipoStock: "PRODUCTO",
        tipoMovimiento: "INGRESO_PRODUCCION",
        origenMovimiento: "PRODUCCION",
        idReferenciaOrigen: 1n,
        idReferenciaDetalle: 22n
      })
    );
    expect(repo.actualizar).toHaveBeenCalledWith(
      tx,
      1n,
      expect.objectContaining({ estadoProduccion: "FINALIZADA", fechaFin: expect.any(Date) })
    );
  });
});
