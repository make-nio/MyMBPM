import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { stockService } from "../stock/stock.service";

import { pedidosRepository } from "./pedidos.repository";
import { pedidosService } from "./pedidos.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("../stock/stock.service", () => ({
  stockService: {
    registrarEgreso: vi.fn()
  }
}));

vi.mock("./pedidos.repository", () => ({
  pedidosRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    agregarDetalle: vi.fn(),
    obtenerDetalle: vi.fn(),
    actualizarDetalle: vi.fn(),
    eliminarDetalle: vi.fn(),
    obtenerItemCatalogo: vi.fn(),
    obtenerCliente: vi.fn()
  }
}));

const repo = vi.mocked(pedidosRepository);
const stock = vi.mocked(stockService);
const dec = (value: number | string) => new Prisma.Decimal(value);

type PedidoConDetalles = NonNullable<Awaited<ReturnType<typeof pedidosRepository.obtenerPorId>>>;

function pedido(overrides: Partial<PedidoConDetalles> = {}) {
  return {
    idPedido: 1n,
    numeroPedido: "PED-000001",
    estadoPedido: "PENDIENTE",
    detalles: [],
    ...overrides
  } as PedidoConDetalles;
}

function detalle(idPedidoDetalle: bigint, idItemCatalogo: bigint, cantidad: number, subtotal = 0) {
  return {
    idPedidoDetalle,
    idPedido: 1n,
    idItemCatalogo,
    cantidad: dec(cantidad),
    precioUnitario: dec(10),
    subtotal: dec(subtotal)
  } as PedidoConDetalles["detalles"][number];
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
});

describe("pedidosService.crear", () => {
  it("falla si el cliente no existe", async () => {
    repo.obtenerCliente.mockResolvedValue(null);

    await expect(pedidosService.crear({ idCliente: 7n, origenPedido: "WEB" })).rejects.toBeInstanceOf(
      ErrorNoEncontrado
    );
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("asigna el numero de pedido a partir del id generado", async () => {
    repo.obtenerCliente.mockResolvedValue({ idCliente: 7n } as never);
    repo.crear.mockResolvedValue({ idPedido: 42n } as never);

    await pedidosService.crear({ idCliente: 7n, origenPedido: "WEB" });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 42n, { numeroPedido: "PED-000042" });
  });
});

describe("pedidosService.agregarDetalle", () => {
  it("solo permite agregar detalles a pedidos pendientes", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));

    await expect(pedidosService.agregarDetalle(1n, { idItemCatalogo: 2n, cantidad: 1 })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.agregarDetalle).not.toHaveBeenCalled();
  });

  it("guarda snapshot de nombre y precios y recalcula totales", async () => {
    repo.obtenerPorId
      .mockResolvedValueOnce(pedido())
      .mockResolvedValueOnce(pedido({ detalles: [detalle(1n, 3n, 2, 20), detalle(2n, 2n, 3, 3001.5)] }))
      .mockResolvedValueOnce(pedido());
    repo.obtenerItemCatalogo.mockResolvedValue({
      idItemCatalogo: 2n,
      nombre: "Vela",
      precio: dec("1000.50"),
      costo: null
    } as never);

    await pedidosService.agregarDetalle(1n, { idItemCatalogo: 2n, cantidad: 3 });

    const nuevoDetalle = repo.agregarDetalle.mock.calls[0][1];
    expect(nuevoDetalle.nombreItemSnapshot).toBe("Vela");
    expect(nuevoDetalle.precioUnitario.toString()).toBe("1000.5");
    expect(nuevoDetalle.costoUnitario.toString()).toBe("0");
    expect(nuevoDetalle.subtotal.toString()).toBe("3001.5");

    const totales = repo.actualizar.mock.calls[0][2];
    expect(totales.subtotal?.toString()).toBe("3021.5");
    expect(totales.total?.toString()).toBe("3021.5");
  });

  it("falla si el item no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido());
    repo.obtenerItemCatalogo.mockResolvedValue(null);

    await expect(pedidosService.agregarDetalle(1n, { idItemCatalogo: 2n, cantidad: 1 })).rejects.toBeInstanceOf(
      ErrorNoEncontrado
    );
  });
});

describe("pedidosService.actualizarDetalle", () => {
  it("rechaza un detalle que pertenece a otro pedido", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido());
    repo.obtenerDetalle.mockResolvedValue({ ...detalle(5n, 2n, 1), idPedido: 99n } as never);

    await expect(pedidosService.actualizarDetalle(1n, 5n, { cantidad: 2 })).rejects.toBeInstanceOf(
      ErrorNoEncontrado
    );
    expect(repo.actualizarDetalle).not.toHaveBeenCalled();
  });
});

describe("pedidosService.actualizarEstado", () => {
  it("no permite confirmar por el endpoint generico de estado", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido());

    await expect(pedidosService.actualizarEstado(1n, { estadoPedido: "CONFIRMADO" })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("pedidosService.confirmar", () => {
  it("falla si el pedido no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(pedidosService.confirmar(1n)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("solo confirma pedidos pendientes", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO", detalles: [detalle(1n, 2n, 1)] }));

    await expect(pedidosService.confirmar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(stock.registrarEgreso).not.toHaveBeenCalled();
  });

  it("exige al menos un detalle", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido());

    await expect(pedidosService.confirmar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("registra un egreso de stock por detalle dentro de la transaccion y confirma", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: [detalle(11n, 2n, 3), detalle(12n, 4n, 1)] }));

    await pedidosService.confirmar(1n, 8n);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(stock.registrarEgreso).toHaveBeenCalledTimes(2);
    expect(stock.registrarEgreso).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        idItemCatalogo: 2n,
        idUsuario: 8n,
        tipoStock: "PRODUCTO",
        tipoMovimiento: "EGRESO_PEDIDO",
        origenMovimiento: "PEDIDO",
        idReferenciaOrigen: 1n,
        idReferenciaDetalle: 11n
      })
    );
    expect(stock.registrarEgreso.mock.calls[0][1].cantidad.toString()).toBe("3");
    expect(repo.actualizar).toHaveBeenCalledWith(
      tx,
      1n,
      expect.objectContaining({ estadoPedido: "CONFIRMADO", fechaConfirmacion: expect.any(Date) })
    );
  });

  it("no cambia el estado si falla el egreso de stock", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: [detalle(11n, 2n, 3)] }));
    stock.registrarEgreso.mockRejectedValue(new ErrorConflicto("Stock insuficiente para realizar la operacion"));

    await expect(pedidosService.confirmar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});
