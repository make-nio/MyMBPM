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
    contarPedidosPorEstados: vi.fn(),
    listarPedidosPorEstados: vi.fn(),
    contarOrdenesPorEstado: vi.fn(),
    listarOrdenesEnProceso: vi.fn(),
    listarPedidosConfirmadosEntre: vi.fn(),
    listarPedidosConEntregaEntre: vi.fn(),
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
  repo.listarPedidosConEntregaEntre.mockResolvedValue([]);
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

    expect(repo.listarPedidosConEntregaEntre).toHaveBeenCalledWith(
      expect.anything(),
      ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO"],
      new Date("2026-10-01T03:00:00Z")
    );
  });

  it("separa los atrasados (antes de hoy) de los que vencen esta semana (hoy incluido)", async () => {
    repo.listarPedidosConEntregaEntre.mockResolvedValue([
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

// Resumen del dia (#101). Los repositorios se simulan sobre una lista de pedidos y existencias:
// asi la misma "base" alimenta el panel, la campanita y el resumen.
type PedidoFalso = { idPedido: bigint; numeroPedido: string; estadoPedido: string; fechaEntrega: Date | null };

function baseFalsa(pedidos: PedidoFalso[], existencias: ReturnType<typeof existencia>[]) {
  const conCliente = (p: PedidoFalso) => ({ ...p, activo: true, cliente: { idCliente: 1n, nombre: "Ana", apellido: `Cliente ${p.idPedido}` } });
  const enRango = (p: PedidoFalso, hasta: Date, desde?: Date) =>
    p.fechaEntrega !== null && p.fechaEntrega < hasta && (desde === undefined || p.fechaEntrega >= desde);
  const porEntrega = (a: PedidoFalso, b: PedidoFalso) =>
    (a.fechaEntrega as Date).getTime() - (b.fechaEntrega as Date).getTime() || Number(a.idPedido - b.idPedido);

  repo.contarPedidosPorEstado.mockImplementation((async () => {
    const conteos = new Map<string, number>();
    pedidos.forEach((p) => conteos.set(p.estadoPedido, (conteos.get(p.estadoPedido) ?? 0) + 1));
    return [...conteos].map(([estadoPedido, total]) => ({ estadoPedido, _count: { _all: total } }));
  }) as never);
  repo.contarPedidosPorEstados.mockImplementation((async (_: unknown, estados: string[]) =>
    pedidos.filter((p) => estados.includes(p.estadoPedido)).length) as never);
  repo.listarPedidosPorEstados.mockImplementation((async (_: unknown, estados: string[], limit: number, orden = "recientes") =>
    pedidos
      .filter((p) => estados.includes(p.estadoPedido))
      .sort((a, b) => (orden === "recientes" ? Number(b.idPedido - a.idPedido) : Number(a.idPedido - b.idPedido)))
      .slice(0, limit)
      .map(conCliente)) as never);
  repo.listarPedidosConEntregaEntre.mockImplementation((async (_: unknown, estados: string[], hasta: Date, desde?: Date, limit?: number) =>
    pedidos
      .filter((p) => estados.includes(p.estadoPedido) && enRango(p, hasta, desde))
      .sort(porEntrega)
      .slice(0, limit)
      .map(conCliente)) as never);
  repo.contarPedidosConEntregaEntre.mockImplementation((async (_: unknown, estados: string[], hasta: Date, desde?: Date) =>
    pedidos.filter((p) => estados.includes(p.estadoPedido) && enRango(p, hasta, desde)).length) as never);
  stock.obtenerExistencias.mockImplementation((async (_: unknown, filtros: { soloBajoMinimo?: boolean }) =>
    filtros.soloBajoMinimo ? existencias.filter((e) => (e as { bajoMinimo: boolean }).bajoMinimo) : existencias) as never);
}

const dia = (iso: string) => new Date(`${iso}T03:00:00Z`);
const ped = (id: number, estadoPedido: string, fechaEntrega: string | null = null): PedidoFalso => ({
  idPedido: BigInt(id),
  numeroPedido: `PED-${id}`,
  estadoPedido,
  fechaEntrega: fechaEntrega ? dia(fechaEntrega) : null
});

describe("panelService.resumenDelDia", () => {
  // 10-oct 15:00 en Argentina.
  const ahora = new Date("2026-10-10T18:00:00Z");

  it("sin nada pendiente: todo en cero, sin frases", async () => {
    baseFalsa([ped(1, "ENTREGADO", "2026-10-01"), ped(2, "CANCELADO", "2026-10-10")], [existencia("PLA", 5, 2, false)]);

    const resumen = await panelService.resumenDelDia(ahora);

    expect(resumen.fecha).toBe("2026-10-10");
    expect(resumen.pedidosParaConfirmar).toEqual({ cantidad: 0, primeros: [] });
    expect(resumen.entregasAtrasadas).toEqual({ cantidad: 0, primeros: [] });
    expect(resumen.entregasDeHoy).toEqual({ cantidad: 0, primeros: [] });
    expect(resumen.paraReponer).toEqual({ cantidad: 0, primeros: [] });
    expect(resumen.frases).toEqual([]);
  });

  it("con uno de cada cosa: frases en singular", async () => {
    baseFalsa(
      [ped(1, "PENDIENTE"), ped(2, "LISTO", "2026-10-08"), ped(3, "CONFIRMADO", "2026-10-10")],
      [existencia("PLA", 1, 2, true)]
    );

    const resumen = await panelService.resumenDelDia(ahora);

    expect(resumen.frases).toEqual(["1 pedido para confirmar", "1 entrega atrasada", "1 entrega para hoy", "1 ítem para reponer"]);
    expect(resumen.entregasAtrasadas.primeros).toEqual([
      { idPedido: 2n, numeroPedido: "PED-2", cliente: "Ana Cliente 2", fechaEntrega: dia("2026-10-08"), diasDeAtraso: 2 }
    ]);
    expect(resumen.entregasDeHoy.primeros.map((p) => p.idPedido)).toEqual([3n]);
  });

  it("con varios: plural, como mucho 3 de cada lista y los mas urgentes primero", async () => {
    baseFalsa(
      [
        ped(5, "PENDIENTE"),
        ped(3, "PENDIENTE"),
        ped(9, "PENDIENTE"),
        ped(4, "PENDIENTE"),
        ped(10, "LISTO", "2026-10-09"),
        ped(11, "EN_PREPARACION", "2026-10-01"),
        ped(12, "CONFIRMADO", "2026-10-05"),
        ped(13, "PENDIENTE", "2026-09-30"),
        ped(14, "LISTO", "2026-10-10"),
        ped(15, "CONFIRMADO", "2026-10-10")
      ],
      [existencia("PLA", 1, 2, true), existencia("PETG", 0, 5, true), existencia("Resina", 2, 3, true), existencia("TPU", 3, 4, true)]
    );

    const resumen = await panelService.resumenDelDia(ahora);

    expect(resumen.frases).toEqual(["5 pedidos para confirmar", "4 entregas atrasadas", "2 entregas para hoy", "4 ítems para reponer"]);
    // Para confirmar: los mas viejos primero.
    expect(resumen.pedidosParaConfirmar.primeros.map((p) => p.idPedido)).toEqual([3n, 4n, 5n]);
    // Atrasadas: la de fecha mas vieja primero.
    expect(resumen.entregasAtrasadas.primeros.map((p) => [p.idPedido, p.diasDeAtraso])).toEqual([
      [13n, 10],
      [11n, 9],
      [12n, 5]
    ]);
    // Para reponer: los que mas lejos quedan de su minimo.
    expect(resumen.paraReponer.primeros.map((item) => [item.nombre, item.faltan.toString()])).toEqual([
      ["PETG", "5"],
      ["PLA", "1"],
      ["Resina", "1"]
    ]);
  });

  it.each([
    ["23:30", "2026-10-11T02:30:00Z"],
    ["00:30", "2026-10-10T03:30:00Z"]
  ])("el borde del dia en Argentina: un pedido prometido para el 10, consultado a las %s del 10", async (_hora, utc) => {
    baseFalsa([ped(1, "CONFIRMADO", "2026-10-10")], []);

    const resumen = await panelService.resumenDelDia(new Date(utc));

    expect(resumen.fecha).toBe("2026-10-10");
    expect(resumen.entregasDeHoy.cantidad).toBe(1);
    expect(resumen.entregasAtrasadas.cantidad).toBe(0);
  });

  it("un pedido entregado o cancelado no cuenta nunca", async () => {
    baseFalsa(
      [ped(1, "ENTREGADO", "2026-10-01"), ped(2, "CANCELADO", "2026-10-10"), ped(3, "DEVUELTO", "2026-10-02"), ped(4, "CANCELADO")],
      []
    );

    const resumen = await panelService.resumenDelDia(ahora);

    expect([resumen.pedidosParaConfirmar.cantidad, resumen.entregasAtrasadas.cantidad, resumen.entregasDeHoy.cantidad]).toEqual([0, 0, 0]);
  });

  it("no trae ningun campo de costo, ganancia ni monto", async () => {
    baseFalsa([ped(1, "PENDIENTE"), ped(2, "LISTO", "2026-10-08")], [existencia("PLA", 1, 2, true)]);

    const texto = JSON.stringify(await panelService.resumenDelDia(ahora), (_k, valor) =>
      typeof valor === "bigint" ? valor.toString() : valor
    );

    expect(texto).not.toMatch(/costo|ganancia|monto|total|precio|vendido|saldo/i);
  });

  it("coincide con el panel (pendientes y bajo minimo) y con la campanita (atrasadas, de hoy y bajo minimo)", async () => {
    baseFalsa(
      [
        ped(1, "PENDIENTE"),
        ped(2, "PENDIENTE", "2026-10-09"),
        ped(3, "CONFIRMADO", "2026-10-10"),
        ped(4, "LISTO", "2026-10-03"),
        ped(5, "EN_PREPARACION", "2026-10-12"),
        ped(6, "ENTREGADO", "2026-10-01"),
        ped(7, "CANCELADO", "2026-10-10")
      ],
      [existencia("PLA", 1, 2, true), existencia("PETG", 9, 2, false), existencia("TPU", 0, 1, true)]
    );

    const [resumen, panel, avisos] = await Promise.all([
      panelService.resumenDelDia(ahora),
      panelService.obtenerResumen({ limite: 5 }, { verCostos: false }, ahora),
      panelService.obtenerAvisos(ahora)
    ]);

    expect(resumen.pedidosParaConfirmar.cantidad).toBe(panel.pedidos.pendientes.total);
    expect(resumen.paraReponer.cantidad).toBe(panel.stockBajo.total);
    expect(resumen.paraReponer.cantidad).toBe(avisos.stockBajo);
    expect(resumen.entregasAtrasadas.cantidad).toBe(avisos.entregasAtrasadas);
    expect(resumen.entregasAtrasadas.cantidad).toBe(panel.entregas.atrasados.total);
    expect(resumen.entregasDeHoy.cantidad).toBe(avisos.entregasHoy);
    expect([resumen.pedidosParaConfirmar.cantidad, resumen.entregasAtrasadas.cantidad, resumen.entregasDeHoy.cantidad, resumen.paraReponer.cantidad]).toEqual([2, 2, 1, 2]);
  });
});
