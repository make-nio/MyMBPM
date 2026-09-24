import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stockService } from "../stock/stock.service";

import { panelRepository } from "./panel.repository";
import { panelService } from "./panel.service";

vi.mock("../../lib/prisma", () => ({ prisma: { cliente: "prisma" } }));

vi.mock("../stock/stock.service", () => ({
  stockService: {
    obtenerExistencias: vi.fn(),
    obtenerUltimosMovimientos: vi.fn()
  }
}));

vi.mock("./panel.repository", () => ({
  panelRepository: {
    contarPedidosPorEstado: vi.fn(),
    listarPedidosPorEstados: vi.fn(),
    contarOrdenesPorEstado: vi.fn(),
    listarOrdenesEnProceso: vi.fn()
  }
}));

const repo = vi.mocked(panelRepository);
const stock = vi.mocked(stockService);
const dec = (valor: number) => new Prisma.Decimal(valor);

function existencia(nombre: string, stockActual: number, stockMinimo: number, bajoMinimo: boolean) {
  return { nombre, stockActual: dec(stockActual), stockMinimo, bajoMinimo } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  repo.contarPedidosPorEstado.mockResolvedValue([
    { estadoPedido: "PENDIENTE", _count: { _all: 3 } },
    { estadoPedido: "CONFIRMADO", _count: { _all: 2 } },
    { estadoPedido: "EN_PREPARACION", _count: { _all: 1 } },
    { estadoPedido: "LISTO", _count: { _all: 4 } },
    { estadoPedido: "ENTREGADO", _count: { _all: 50 } },
    { estadoPedido: "CANCELADO", _count: { _all: 7 } }
  ] as never);
  repo.listarPedidosPorEstados.mockResolvedValue([]);
  repo.contarOrdenesPorEstado.mockResolvedValue([
    { estadoProduccion: "EN_PROCESO", _count: { _all: 2 } },
    { estadoProduccion: "PENDIENTE", _count: { _all: 5 } },
    { estadoProduccion: "FINALIZADA", _count: { _all: 9 } }
  ] as never);
  repo.listarOrdenesEnProceso.mockResolvedValue([]);
  stock.obtenerExistencias.mockResolvedValue([]);
  stock.obtenerUltimosMovimientos.mockResolvedValue([]);
});

describe("panelService.obtenerResumen", () => {
  it("cuenta pendientes aparte de confirmados sin entregar (confirmado, en preparacion y listo)", async () => {
    const resumen = await panelService.obtenerResumen({ limite: 5 });

    expect(resumen.pedidos.pendientes.total).toBe(3);
    expect(resumen.pedidos.confirmados.total).toBe(7);
    expect(repo.listarPedidosPorEstados).toHaveBeenCalledWith({ cliente: "prisma" }, ["PENDIENTE"], 5);
    expect(repo.listarPedidosPorEstados).toHaveBeenCalledWith(
      { cliente: "prisma" },
      ["CONFIRMADO", "EN_PREPARACION", "LISTO"],
      5
    );
  });

  it("informa las ordenes en proceso y cuantas esperan para iniciar", async () => {
    const resumen = await panelService.obtenerResumen({ limite: 5 });

    expect(resumen.produccion.enProceso.total).toBe(2);
    expect(resumen.produccion.pendientes).toBe(5);
  });

  it("lista solo los items bajo el minimo, los mas lejos del minimo primero, hasta el limite", async () => {
    stock.obtenerExistencias.mockResolvedValue([
      existencia("OK", 10, 2, false),
      existencia("Apenas", 4, 5, true),
      existencia("Agotado", 0, 8, true),
      existencia("Justo", 3, 3, true)
    ]);

    const resumen = await panelService.obtenerResumen({ limite: 2 });

    expect(stock.obtenerExistencias).toHaveBeenCalledWith({ cliente: "prisma" }, { activo: true });
    expect(resumen.stockBajo.total).toBe(3);
    expect(resumen.stockBajo.items.map((item: { nombre: string }) => item.nombre)).toEqual(["Agotado", "Apenas"]);
  });

  it("devuelve los ultimos movimientos que pide al servicio de stock", async () => {
    stock.obtenerUltimosMovimientos.mockResolvedValue([{ idEstadoStock: 9n }] as never);

    const resumen = await panelService.obtenerResumen({ limite: 4 });

    expect(stock.obtenerUltimosMovimientos).toHaveBeenCalledWith({ cliente: "prisma" }, 4);
    expect(resumen.ultimosMovimientos).toEqual([{ idEstadoStock: 9n }]);
  });

  it("sin datos devuelve ceros, no falla", async () => {
    repo.contarPedidosPorEstado.mockResolvedValue([]);
    repo.contarOrdenesPorEstado.mockResolvedValue([]);

    const resumen = await panelService.obtenerResumen({ limite: 5 });

    expect([
      resumen.pedidos.pendientes.total,
      resumen.pedidos.confirmados.total,
      resumen.produccion.enProceso.total,
      resumen.stockBajo.total
    ]).toEqual([0, 0, 0, 0]);
  });
});
