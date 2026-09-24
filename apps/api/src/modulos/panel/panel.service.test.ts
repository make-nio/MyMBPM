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
    listarOrdenesEnProceso: vi.fn(),
    listarPedidosConfirmadosEntre: vi.fn(),
    listarPedidosConEntregaAntesDe: vi.fn(),
    contarPedidosConEntregaEntre: vi.fn()
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
  repo.listarPedidosConfirmadosEntre.mockResolvedValue([]);
  repo.listarPedidosConEntregaAntesDe.mockResolvedValue([]);
  stock.obtenerExistencias.mockResolvedValue([]);
  stock.obtenerUltimosMovimientos.mockResolvedValue([]);
});

describe("panelService.obtenerResumen", () => {
  it("cuenta pendientes aparte de confirmados sin entregar (confirmado, en preparacion y listo)", async () => {
    const resumen = await panelService.obtenerResumen({ limite: 5 }, { verCostos: true });

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
    const resumen = await panelService.obtenerResumen({ limite: 5 }, { verCostos: true });

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

    const resumen = await panelService.obtenerResumen({ limite: 2 }, { verCostos: true });

    expect(stock.obtenerExistencias).toHaveBeenCalledWith({ cliente: "prisma" }, { activo: true });
    expect(resumen.stockBajo.total).toBe(3);
    expect(resumen.stockBajo.items.map((item: { nombre: string }) => item.nombre)).toEqual(["Agotado", "Apenas"]);
  });

  it("devuelve los ultimos movimientos que pide al servicio de stock", async () => {
    stock.obtenerUltimosMovimientos.mockResolvedValue([{ idEstadoStock: 9n }] as never);

    const resumen = await panelService.obtenerResumen({ limite: 4 }, { verCostos: true });

    expect(stock.obtenerUltimosMovimientos).toHaveBeenCalledWith({ cliente: "prisma" }, 4);
    expect(resumen.ultimosMovimientos).toEqual([{ idEstadoStock: 9n }]);
  });

  it("sin datos devuelve ceros, no falla", async () => {
    repo.contarPedidosPorEstado.mockResolvedValue([]);
    repo.contarOrdenesPorEstado.mockResolvedValue([]);

    const resumen = await panelService.obtenerResumen({ limite: 5 }, { verCostos: true });

    expect([
      resumen.pedidos.pendientes.total,
      resumen.pedidos.confirmados.total,
      resumen.produccion.enProceso.total,
      resumen.stockBajo.total
    ]).toEqual([0, 0, 0, 0]);
  });
});

describe("panelService.obtenerResumen: ventas del mes", () => {
  it("suma lo confirmado en el mes de Argentina", async () => {
    repo.listarPedidosConfirmadosEntre.mockResolvedValue([
      { total: dec(1000), detalles: [{ cantidad: dec(2), costoUnitario: dec(300) }] }
    ] as never);

    const resumen = await panelService.obtenerResumen({ limite: 5 }, { verCostos: true }, new Date("2026-09-24T12:00:00Z"));

    expect(repo.listarPedidosConfirmadosEntre).toHaveBeenCalledWith(
      expect.anything(),
      new Date("2026-09-01T03:00:00Z"),
      new Date("2026-10-01T03:00:00Z")
    );
    expect(resumen.ventasDelMes?.vendido.toString()).toBe("1000");
    expect(resumen.ventasDelMes?.costo.toString()).toBe("600");
    expect(resumen.ventasDelMes?.ganancia.toString()).toBe("400");
  });
});

describe("panelService.obtenerResumen: sin permiso para ver costos", () => {
  it("no calcula ni devuelve las ventas del mes", async () => {
    const resumen = await panelService.obtenerResumen({ limite: 5 }, { verCostos: false });

    expect(resumen).not.toHaveProperty("ventasDelMes");
    expect(repo.listarPedidosConfirmadosEntre).not.toHaveBeenCalled();
  });
});


describe("panelService.obtenerResumen: entregas prometidas", () => {
  const ahora = new Date("2026-09-24T12:00:00Z");
  const conFecha = (idPedido: bigint, fechaEntrega: string) => ({ idPedido, fechaEntrega: new Date(fechaEntrega) });

  it("pide los pedidos abiertos con fecha antes de 7 dias desde hoy (hora de Argentina)", async () => {
    await panelService.obtenerResumen({ limite: 5 }, { verCostos: false }, ahora);

    expect(repo.listarPedidosConEntregaAntesDe).toHaveBeenCalledWith(
      expect.anything(),
      ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO"],
      new Date("2026-10-01T03:00:00Z")
    );
  });

  it("separa los atrasados (antes de hoy) de los que vencen esta semana (hoy incluido)", async () => {
    repo.listarPedidosConEntregaAntesDe.mockResolvedValue([
      conFecha(1n, "2026-09-20T03:00:00Z"),
      conFecha(2n, "2026-09-23T03:00:00Z"),
      conFecha(3n, "2026-09-24T03:00:00Z"),
      conFecha(4n, "2026-09-30T03:00:00Z")
    ] as never);

    const resumen = await panelService.obtenerResumen({ limite: 1 }, { verCostos: false }, ahora);

    expect(resumen.entregas.atrasados.total).toBe(2);
    expect(resumen.entregas.atrasados.pedidos.map((pedido) => pedido.idPedido)).toEqual([1n]);
    expect(resumen.entregas.estaSemana.total).toBe(2);
    expect(resumen.entregas.estaSemana.pedidos.map((pedido) => pedido.idPedido)).toEqual([3n]);
  });
});

describe("panelService.obtenerAvisos", () => {
  it("cuenta items bajo el minimo y entregas atrasadas y de hoy, con el dia de Argentina", async () => {
    stock.obtenerExistencias.mockResolvedValue([existencia("PLA", 0, 2, true), existencia("PETG", 1, 3, true)]);
    repo.contarPedidosConEntregaEntre.mockResolvedValueOnce(4).mockResolvedValueOnce(1);

    // 02:00 UTC del 11 de marzo = 23:00 del 10 de marzo en Argentina.
    const avisos = await panelService.obtenerAvisos(new Date("2026-03-11T02:00:00Z"));

    expect(avisos).toEqual({ stockBajo: 2, entregasAtrasadas: 4, entregasHoy: 1 });
    expect(stock.obtenerExistencias).toHaveBeenCalledWith(expect.anything(), { activo: true, soloBajoMinimo: true });

    const hoy = new Date("2026-03-10T03:00:00Z");
    const manana = new Date("2026-03-11T03:00:00Z");
    const estados = ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO"];
    expect(repo.contarPedidosConEntregaEntre).toHaveBeenNthCalledWith(1, expect.anything(), estados, hoy);
    expect(repo.contarPedidosConEntregaEntre).toHaveBeenNthCalledWith(2, expect.anything(), estados, manana, hoy);
  });
});
