import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reportesRepository } from "./reportes.repository";
import { reportesService } from "./reportes.service";

vi.mock("../../lib/prisma", () => ({ prisma: { cliente: "prisma" } }));
vi.mock("./reportes.repository", () => ({ reportesRepository: { listarPedidosVendidosEntre: vi.fn() } }));

const repo = vi.mocked(reportesRepository);
const dec = (valor: number) => new Prisma.Decimal(valor);

function linea(idItem: bigint, nombre: string, cantidad: number, precio: number, costo: number) {
  return {
    idItemCatalogo: idItem,
    nombreItemSnapshot: `${nombre} (snapshot)`,
    cantidad: dec(cantidad),
    costoUnitario: dec(costo),
    subtotal: dec(cantidad * precio),
    itemCatalogo: { nombre }
  };
}

function pedido(idPedido: bigint, cliente: { idCliente: bigint; nombre: string; apellido: string | null }, detalles: ReturnType<typeof linea>[]) {
  const total = detalles.reduce((suma, detalle) => suma.add(detalle.subtotal), dec(0));
  return { idPedido, total, cliente, detalles };
}

const ana = { idCliente: 1n, nombre: "Ana", apellido: "Diaz" };
const bruno = { idCliente: 2n, nombre: "Bruno", apellido: null };

beforeEach(() => {
  repo.listarPedidosVendidosEntre.mockResolvedValue([
    pedido(10n, ana, [linea(100n, "Maceta", 2, 1000, 300), linea(200n, "Vela", 1, 500, 0)]),
    pedido(11n, bruno, [linea(100n, "Maceta", 1, 1000, 300)]),
    pedido(12n, ana, [linea(200n, "Vela", 3, 500, 100)])
  ] as never);
});

describe("reportesService.ventasDelMes", () => {
  it("usa el mes pedido en hora de Argentina", async () => {
    const reporte = await reportesService.ventasDelMes({ mes: "2026-08" });

    expect(repo.listarPedidosVendidosEntre).toHaveBeenCalledWith(
      { cliente: "prisma" },
      new Date("2026-08-01T03:00:00Z"),
      new Date("2026-09-01T03:00:00Z")
    );
    expect(reporte.desde).toEqual(new Date("2026-08-01T03:00:00Z"));
  });

  it("sin mes toma el mes en curso", async () => {
    await reportesService.ventasDelMes({}, new Date("2026-09-24T12:00:00Z"));

    expect(repo.listarPedidosVendidosEntre).toHaveBeenCalledWith(
      expect.anything(),
      new Date("2026-09-01T03:00:00Z"),
      new Date("2026-10-01T03:00:00Z")
    );
  });

  it("agrupa por item con cantidad, vendido, costo, ganancia y pedidos, lo mas vendido primero", async () => {
    const { porItem } = await reportesService.ventasDelMes({ mes: "2026-09" });

    expect(
      porItem.map((item) => ({
        id: item.idItemCatalogo,
        nombre: item.nombre,
        cantidad: item.cantidad.toString(),
        vendido: item.vendido.toString(),
        costo: item.costo.toString(),
        ganancia: item.ganancia.toString(),
        pedidos: item.pedidos
      }))
    ).toEqual([
      { id: 100n, nombre: "Maceta", cantidad: "3", vendido: "3000", costo: "900", ganancia: "2100", pedidos: 2 },
      { id: 200n, nombre: "Vela", cantidad: "4", vendido: "2000", costo: "300", ganancia: "1700", pedidos: 2 }
    ]);
  });

  it("agrupa por cliente con pedidos y vendido, y los totales cierran con los del panel", async () => {
    const { porCliente, totales } = await reportesService.ventasDelMes({ mes: "2026-09" });

    expect(
      porCliente.map((cliente) => ({
        nombre: cliente.nombre,
        pedidos: cliente.pedidos,
        vendido: cliente.vendido.toString(),
        ganancia: cliente.ganancia.toString()
      }))
    ).toEqual([
      { nombre: "Ana Diaz", pedidos: 2, vendido: "4000", ganancia: "3100" },
      { nombre: "Bruno", pedidos: 1, vendido: "1000", ganancia: "700" }
    ]);
    expect(totales.vendido.toString()).toBe("5000");
    expect(totales.ganancia.toString()).toBe("3800");
    expect(totales.lineasSinCosto).toBe(1);
  });

  it("sin ventas devuelve listas vacias y totales en cero", async () => {
    repo.listarPedidosVendidosEntre.mockResolvedValue([]);

    const reporte = await reportesService.ventasDelMes({ mes: "2026-09" });

    expect(reporte.porItem).toEqual([]);
    expect(reporte.porCliente).toEqual([]);
    expect(reporte.totales.pedidos).toBe(0);
  });
});
