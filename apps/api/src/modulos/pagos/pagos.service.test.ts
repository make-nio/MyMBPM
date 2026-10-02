import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { calcularEstadoCobro } from "../../compartido/dominio/cobro";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { devolucionesRepository } from "../devoluciones/devoluciones.repository";
import { pedidosRepository } from "../pedidos/pedidos.repository";

import { pagosRepository } from "./pagos.repository";
import { pagosService } from "./pagos.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("../pedidos/pedidos.repository", () => ({
  pedidosRepository: {
    obtenerPorId: vi.fn(),
    actualizar: vi.fn()
  }
}));

vi.mock("../devoluciones/devoluciones.repository", () => ({
  devolucionesRepository: {
    valorDevuelto: vi.fn()
  }
}));

vi.mock("./pagos.repository", () => ({
  pagosRepository: {
    listarPorPedido: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    anular: vi.fn(),
    bloquearPedido: vi.fn()
  }
}));

const pedidos = vi.mocked(pedidosRepository);
const devoluciones = vi.mocked(devolucionesRepository);
const repo = vi.mocked(pagosRepository);
const dec = (valor: number | string) => new Prisma.Decimal(valor);

function pedido(overrides: Record<string, unknown> = {}) {
  return { idPedido: 1n, total: dec(1000), estadoPedido: "CONFIRMADO", estadoCobro: "PENDIENTE", ...overrides } as never;
}

function pago(monto: number, overrides: Record<string, unknown> = {}) {
  return { idPago: 9n, idPedido: 1n, monto: dec(monto), anulado: false, ...overrides } as never;
}

const hoy = new Date("2026-09-28T03:00:00Z");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
  devoluciones.valorDevuelto.mockResolvedValue(dec(0));
});

describe("calcularEstadoCobro", () => {
  it.each([
    [0, true, "PENDIENTE"],
    [300, true, "SEÑADO"],
    [1000, true, "PAGADO"],
    [1200, true, "PAGADO"],
    [0, false, null]
  ] as const)("cobrado %s de 1000 (con pagos: %s) -> %s", (cobrado, tienePagos, esperado) => {
    expect(calcularEstadoCobro(dec(1000), dec(cobrado), tienePagos)).toBe(esperado);
  });
});

describe("pagosService.registrar", () => {
  it("registra el pago a nombre del usuario y pasa el pedido a SEÑADO", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido());
    repo.listarPorPedido.mockResolvedValueOnce([]).mockResolvedValueOnce([pago(300)]);

    const resultado = await pagosService.registrar(1n, { fecha: hoy, monto: 300, medioPago: "EFECTIVO" }, 7n);

    expect(repo.bloquearPedido).toHaveBeenCalledWith(tx, 1n);
    expect(repo.crear).toHaveBeenCalledWith(tx, {
      idPedido: 1n,
      fecha: hoy,
      monto: dec(300),
      medioPago: "EFECTIVO",
      observaciones: undefined,
      idUsuario: 7n
    });
    expect(pedidos.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoCobro: "SEÑADO" });
    expect(resultado.cobrado.toString()).toBe("300");
    expect(resultado.saldo.toString()).toBe("700");
  });

  it("no deja cobrar mas que el saldo (409)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido());
    repo.listarPorPedido.mockResolvedValue([pago(800), pago(500, { anulado: true })]);

    await expect(pagosService.registrar(1n, { fecha: hoy, monto: 300, medioPago: "TRANSFERENCIA" })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("completa el saldo exacto y queda PAGADO", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoCobro: "SEÑADO" }));
    repo.listarPorPedido.mockResolvedValueOnce([pago(800)]).mockResolvedValueOnce([pago(800), pago(200)]);

    await pagosService.registrar(1n, { fecha: hoy, monto: 200, medioPago: "MERCADO_PAGO" });

    expect(pedidos.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoCobro: "PAGADO" });
  });

  it("no registra pagos en un pedido cancelado", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CANCELADO" }));

    await expect(pagosService.registrar(1n, { fecha: hoy, monto: 1, medioPago: "EFECTIVO" })).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.crear).not.toHaveBeenCalled();
  });
});

describe("pagosService con devoluciones (#96)", () => {
  it("lo devuelto baja lo que hay que cobrar: el saldo es total - devuelto - cobrado", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoCobro: "PAGADO" }));
    devoluciones.valorDevuelto.mockResolvedValue(dec(400));
    repo.listarPorPedido.mockResolvedValue([pago(1000), pago(-400, { idPago: 10n })]);

    const resultado = await pagosService.recalcularEstadoCobro(tx as never, 1n);

    expect(resultado.devuelto.toString()).toBe("400");
    expect(resultado.cobrado.toString()).toBe("600");
    expect(resultado.saldo.toString()).toBe("0");
    expect(pedidos.actualizar).not.toHaveBeenCalled();
  });

  it("no deja cobrar mas que el saldo con lo devuelto descontado (409)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "ENTREGADO" }));
    devoluciones.valorDevuelto.mockResolvedValue(dec(500));
    repo.listarPorPedido.mockResolvedValue([pago(400)]);

    await expect(pagosService.registrar(1n, { fecha: hoy, monto: 200, medioPago: "EFECTIVO" })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("un reintegro (pago negativo) no se anula (409)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido());
    repo.obtenerPorId.mockResolvedValue(pago(-300));

    await expect(pagosService.anular(1n, 9n, "x")).rejects.toThrow(/reintegro no se anula/);
    expect(repo.anular).not.toHaveBeenCalled();
  });
});

describe("pagosService.anular", () => {
  it("anula con motivo y recalcula: sin pagos vigentes vuelve a PENDIENTE", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoCobro: "SEÑADO" }));
    repo.obtenerPorId.mockResolvedValue(pago(300));
    repo.listarPorPedido.mockResolvedValue([pago(300, { anulado: true })]);

    await pagosService.anular(1n, 9n, "se cargo dos veces", 7n, hoy);

    expect(repo.anular).toHaveBeenCalledWith(tx, 9n, { motivo: "se cargo dos veces", idUsuario: 7n, fecha: hoy });
    expect(pedidos.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoCobro: "PENDIENTE" });
  });

  it("un pago de otro pedido no se alcanza desde este (404)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido());
    repo.obtenerPorId.mockResolvedValue(pago(300, { idPedido: 2n }));

    await expect(pagosService.anular(1n, 9n, "x")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repo.anular).not.toHaveBeenCalled();
  });

  it("un pago ya anulado no se anula de nuevo (409)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido());
    repo.obtenerPorId.mockResolvedValue(pago(300, { anulado: true }));

    await expect(pagosService.anular(1n, 9n, "x")).rejects.toBeInstanceOf(ErrorConflicto);
  });
});

describe("pagosService.recalcularEstadoCobro", () => {
  it("un pedido sin pagos conserva el estado que tenia (marcado a mano antes de #90)", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoCobro: "PAGADO" }));
    repo.listarPorPedido.mockResolvedValue([]);

    const resultado = await pagosService.recalcularEstadoCobro(tx as never, 1n);

    expect(pedidos.actualizar).not.toHaveBeenCalled();
    expect(resultado.estadoCobro).toBe("PAGADO");
  });

  it("si baja el total por debajo de lo cobrado queda PAGADO", async () => {
    pedidos.obtenerPorId.mockResolvedValue(pedido({ total: dec(200), estadoCobro: "SEÑADO" }));
    repo.listarPorPedido.mockResolvedValue([pago(300)]);

    await pagosService.recalcularEstadoCobro(tx as never, 1n);

    expect(pedidos.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoCobro: "PAGADO" });
  });
});
