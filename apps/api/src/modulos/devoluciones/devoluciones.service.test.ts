import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { prisma } from "../../lib/prisma";
import { configuracionService } from "../configuracion/configuracion.service";
import { pagosRepository } from "../pagos/pagos.repository";
import { pagosService } from "../pagos/pagos.service";
import { pedidosRepository } from "../pedidos/pedidos.repository";
import { stockService } from "../stock/stock.service";

import { devolucionesRepository } from "./devoluciones.repository";
import { devolucionesService } from "./devoluciones.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("../configuracion/configuracion.service", () => ({ configuracionService: { decidirDevolucion: vi.fn() } }));
vi.mock("../pagos/pagos.repository", () => ({
  pagosRepository: { bloquearPedido: vi.fn(), listarPorPedido: vi.fn(), crear: vi.fn() }
}));
vi.mock("../pagos/pagos.service", () => ({ pagosService: { recalcularEstadoCobro: vi.fn() } }));
vi.mock("../pedidos/pedidos.repository", () => ({ pedidosRepository: { obtenerPorId: vi.fn() } }));
vi.mock("../stock/stock.service", async (original) => {
  const modulo = await original<typeof import("../stock/stock.service")>();
  return { ...modulo, stockService: { registrarIngreso: vi.fn() } };
});
vi.mock("./devoluciones.repository", () => ({
  devolucionesRepository: { listarPorPedido: vi.fn(), cantidadesDevueltas: vi.fn(), crear: vi.fn() }
}));

const dec = (valor: number | string) => new Prisma.Decimal(valor);
const config = vi.mocked(configuracionService);
const pagos = vi.mocked(pagosRepository);
const pedidos = vi.mocked(pedidosRepository);
const stock = vi.mocked(stockService);
const repo = vi.mocked(devolucionesRepository);

// Pedido entregado con dos lineas: 3 velas (item 20) a 100 y 2 macetas (item 10) a 250.
function pedido(overrides: Record<string, unknown> = {}) {
  return {
    idPedido: 1n,
    numeroPedido: "PED-1",
    estadoPedido: "ENTREGADO",
    detalles: [
      { idPedidoDetalle: 5n, idItemCatalogo: 20n, nombreItemSnapshot: "Vela", cantidad: dec(3), precioUnitario: dec(100) },
      { idPedidoDetalle: 6n, idItemCatalogo: 10n, nombreItemSnapshot: "Maceta", cantidad: dec(2), precioUnitario: dec(250) }
    ],
    ...overrides
  } as never;
}

// Lo que devuelve crear: cada linea con su id y el item de la linea del pedido.
function devolucionCreada(lineas: Array<{ idPedidoDetalle: bigint; cantidad: Prisma.Decimal }>) {
  const items: Record<string, bigint> = { "5": 20n, "6": 10n };
  return {
    idDevolucion: 40n,
    detalles: lineas.map((linea, indice) => ({
      idDevolucionDetalle: 400n + BigInt(indice),
      cantidad: linea.cantidad,
      pedidoDetalle: { idItemCatalogo: items[linea.idPedidoDetalle.toString()] }
    }))
  } as never;
}

const ambasLineas = [
  { idPedidoDetalle: 5n, cantidad: 2 },
  { idPedidoDetalle: 6n, cantidad: 1 }
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
  pedidos.obtenerPorId.mockResolvedValue(pedido());
  repo.cantidadesDevueltas.mockResolvedValue(new Map());
  repo.listarPorPedido.mockResolvedValue([]);
  repo.crear.mockImplementation((async (_tx: unknown, data: { detalles: never[] }) => devolucionCreada(data.detalles)) as never);
  pagos.listarPorPedido.mockResolvedValue([]);
  pagos.crear.mockResolvedValue({ idPago: 77n } as never);
});

// Que decide la configuracion: [vuelve al stock, se reintegra].
function decide(stockSi: boolean, reintegroSi: boolean) {
  config.decidirDevolucion.mockImplementation((async (accion: string) =>
    accion === "devolucionStock" ? stockSi : reintegroSi) as never);
}

describe("devolucionesService.registrar", () => {
  it("guarda la devolucion con el valor de cada linea, ingresa el stock en orden de item y recalcula el cobro", async () => {
    decide(true, false);

    await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "Llego rota" }, 7n);

    expect(pagos.bloquearPedido).toHaveBeenCalledWith(tx, 1n);
    expect(repo.crear).toHaveBeenCalledWith(tx, {
      idPedido: 1n,
      motivo: "Llego rota",
      devuelveStock: true,
      idPagoReintegro: undefined,
      idUsuario: 7n,
      detalles: [
        { idPedidoDetalle: 5n, cantidad: dec(2), precioUnitario: dec(100), subtotal: dec(200) },
        { idPedidoDetalle: 6n, cantidad: dec(1), precioUnitario: dec(250), subtotal: dec(250) }
      ]
    });
    // La maceta (item 10) antes que la vela (item 20): mismo orden que el resto de los locks.
    expect(stock.registrarIngreso.mock.calls.map(([, input]) => input.idItemCatalogo)).toEqual([10n, 20n]);
    expect(stock.registrarIngreso).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tipoStock: "PRODUCTO",
        tipoMovimiento: "INGRESO_DEVOLUCION",
        origenMovimiento: "DEVOLUCION",
        idReferenciaOrigen: 40n,
        idReferenciaDetalle: 401n,
        cantidad: dec(1),
        idUsuario: 7n
      })
    );
    expect(pagos.crear).not.toHaveBeenCalled();
    expect(vi.mocked(pagosService.recalcularEstadoCobro)).toHaveBeenCalledWith(tx, 1n);
  });

  it("si no vuelve al stock no hay movimientos", async () => {
    decide(false, false);

    await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "No le gusto" });

    expect(repo.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ devuelveStock: false }));
    expect(stock.registrarIngreso).not.toHaveBeenCalled();
  });

  it("pasa la eleccion de quien la registra a la configuracion", async () => {
    decide(true, false);

    await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x", devolverStock: true, reintegrar: false });

    expect(config.decidirDevolucion).toHaveBeenCalledWith("devolucionStock", true);
    expect(config.decidirDevolucion).toHaveBeenCalledWith("devolucionReintegro", false);
  });

  it("solo un pedido entregado (409)", async () => {
    decide(true, false);
    pedidos.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));

    await expect(devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x" })).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("no devuelve mas de lo entregado menos lo ya devuelto (409)", async () => {
    decide(true, false);
    repo.cantidadesDevueltas.mockResolvedValue(new Map([[5n, dec(2)]]));

    const error = await devolucionesService
      .registrar(1n, { lineas: [{ idPedidoDetalle: 5n, cantidad: 2 }], motivo: "x" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ErrorConflicto);
    expect(error.message).toMatch(/Vela.*hasta 1/);
    expect(repo.crear).not.toHaveBeenCalled();
    expect(stock.registrarIngreso).not.toHaveBeenCalled();
  });

  it("una linea de otro pedido no se alcanza (404)", async () => {
    decide(true, false);

    await expect(
      devolucionesService.registrar(1n, { lineas: [{ idPedidoDetalle: 99n, cantidad: 1 }], motivo: "x" })
    ).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});

describe("devolucionesService.registrar: reintegro", () => {
  it("sin monto reintegra lo devuelto como un pago negativo, si se cobro al menos eso", async () => {
    decide(false, true);
    pagos.listarPorPedido.mockResolvedValue([{ monto: dec(1000), anulado: false }] as never);

    await devolucionesService.registrar(
      1n,
      { lineas: ambasLineas, motivo: "Llego rota", medioReintegro: "TRANSFERENCIA" },
      7n
    );

    expect(pagos.crear).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ idPedido: 1n, monto: dec(-450), medioPago: "TRANSFERENCIA", idUsuario: 7n })
    );
    expect(repo.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ idPagoReintegro: 77n }));
  });

  it("sin monto, nunca mas de lo cobrado", async () => {
    decide(false, true);
    pagos.listarPorPedido.mockResolvedValue([{ monto: dec(300), anulado: false }, { monto: dec(500), anulado: true }] as never);

    await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x", medioReintegro: "EFECTIVO" });

    expect(pagos.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ monto: dec(-300) }));
  });

  it("un monto que supera lo cobrado da 409", async () => {
    decide(false, true);
    pagos.listarPorPedido.mockResolvedValue([{ monto: dec(300), anulado: false }] as never);

    await expect(
      devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x", montoReintegro: 301, medioReintegro: "EFECTIVO" })
    ).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("sin medio da 400 en medioReintegro", async () => {
    decide(false, true);
    pagos.listarPorPedido.mockResolvedValue([{ monto: dec(300), anulado: false }] as never);

    const error = await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x" }).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error.detalles).toEqual([{ path: "medioReintegro", message: "Elegi el medio del reintegro" }]);
  });

  it("si no se cobro nada no hay reintegro", async () => {
    decide(false, true);

    await devolucionesService.registrar(1n, { lineas: ambasLineas, motivo: "x" });

    expect(pagos.crear).not.toHaveBeenCalled();
    expect(repo.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ idPagoReintegro: undefined }));
  });
});

describe("devolucionesService.listar", () => {
  it("suma el valor de todas las devoluciones del pedido", async () => {
    repo.listarPorPedido.mockResolvedValue([
      { detalles: [{ subtotal: dec(200) }, { subtotal: dec(250) }] },
      { detalles: [{ subtotal: dec(100) }] }
    ] as never);

    const resultado = await devolucionesService.listar(1n);

    expect(resultado.devuelto.toString()).toBe("550");
  });

  it("un pedido que no existe da 404", async () => {
    pedidos.obtenerPorId.mockResolvedValue(null);

    await expect(devolucionesService.listar(1n)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
