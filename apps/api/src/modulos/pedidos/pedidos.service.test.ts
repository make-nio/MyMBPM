import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { configuracionService } from "../configuracion/configuracion.service";
import { pagosRepository } from "../pagos/pagos.repository";
import { stockService } from "../stock/stock.service";

import { pedidosRepository } from "./pedidos.repository";
import { ocultarCostos, pedidosService } from "./pedidos.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("../stock/stock.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../stock/stock.service")>()),
  stockService: {
    registrarEgreso: vi.fn(),
    revertirMovimientos: vi.fn()
  }
}));

vi.mock("../configuracion/configuracion.service", () => ({
  configuracionService: {
    decidirDevolucion: vi.fn()
  }
}));

vi.mock("../pagos/pagos.service", () => ({
  pagosService: {
    recalcularEstadoCobro: vi.fn()
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
    obtenerItemsCatalogo: vi.fn(),
    obtenerCliente: vi.fn(),
    registrarCambioEstado: vi.fn(),
    listarHistorial: vi.fn()
  }
}));

vi.mock("../pagos/pagos.repository", () => ({
  pagosRepository: {
    bloquearPedido: vi.fn()
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

  it("guarda la fecha de entrega prometida", async () => {
    const fechaEntrega = new Date("2026-09-30T03:00:00Z");
    repo.obtenerCliente.mockResolvedValue({ idCliente: 7n } as never);
    repo.crear.mockResolvedValue({ idPedido: 42n } as never);

    await pedidosService.crear({ idCliente: 7n, origenPedido: "WEB", fechaEntrega });

    expect(repo.crear).toHaveBeenCalledWith(tx, { idCliente: 7n, origenPedido: "WEB", fechaEntrega, idUsuarioAlta: undefined });
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

  it("rechaza la linea 101: un pedido tiene como mucho 100", async () => {
    const lineas = Array.from({ length: 100 }, (_, i) => detalle(BigInt(i + 1), 2n, 1, 10));
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: lineas }));

    await expect(pedidosService.agregarDetalle(1n, { idItemCatalogo: 2n, cantidad: 1 })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("como mucho 100 lineas")
    });
    expect(repo.agregarDetalle).not.toHaveBeenCalled();
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

describe("pedidosService.actualizarEstado (transiciones)", () => {
  it.each([
    ["PENDIENTE", "EN_PREPARACION"],
    ["PENDIENTE", "ENTREGADO"],
    ["CONFIRMADO", "PENDIENTE"],
    ["EN_PREPARACION", "PENDIENTE"],
    ["ENTREGADO", "CANCELADO"],
    ["CANCELADO", "EN_PREPARACION"]
  ] as const)("rechaza %s -> %s", async (actual, nuevo) => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: actual }));

    await expect(pedidosService.actualizarEstado(1n, { estadoPedido: nuevo })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it.each([
    ["PENDIENTE", "CANCELADO"],
    ["CONFIRMADO", "EN_PREPARACION"],
    ["EN_PREPARACION", "LISTO"],
    ["LISTO", "EN_PREPARACION"],
    ["LISTO", "ENTREGADO"]
  ] as const)("permite %s -> %s", async (actual, nuevo) => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: actual }));

    await pedidosService.actualizarEstado(1n, { estadoPedido: nuevo, ...(nuevo === "CANCELADO" ? { motivoCancelacion: "x" } : {}) });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, expect.objectContaining({ estadoPedido: nuevo }));
  });

  it("permite cambiar solo el cobro de un pedido entregado", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "ENTREGADO" }));

    await pedidosService.actualizarEstado(1n, { estadoPedido: "ENTREGADO", estadoCobro: "PAGADO" });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "ENTREGADO", estadoCobro: "PAGADO" });
  });
});

describe("pedidosService.actualizarEstado (cancelar un pedido que desconto stock)", () => {
  const configuracion = vi.mocked(configuracionService);

  it.each(["CONFIRMADO", "EN_PREPARACION", "LISTO"] as const)(
    "desde %s devuelve el stock en la misma transaccion si la configuracion lo decide",
    async (actual) => {
      repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: actual }));
      configuracion.decidirDevolucion.mockResolvedValue(true);

      await pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", devolverStock: true, motivoCancelacion: "Se arrepintio" }, 7n);

      expect(configuracion.decidirDevolucion).toHaveBeenCalledWith("cancelarPedido", true);
      expect(stock.revertirMovimientos).toHaveBeenCalledWith(tx, {
        origenMovimiento: "PEDIDO",
        idReferenciaOrigen: 1n,
        tipoMovimiento: "EGRESO_PEDIDO",
        idUsuario: 7n,
        observaciones: "Cancelacion del pedido PED-000001"
      });
      // devolverStock no se guarda en el pedido.
      expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "CANCELADO", motivoCancelacion: "Se arrepintio" });
    }
  );

  it("no devuelve nada si la configuracion (o quien cancela) decide no devolver", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));
    configuracion.decidirDevolucion.mockResolvedValue(false);

    await pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", devolverStock: false, motivoCancelacion: "Se arrepintio" });

    expect(stock.revertirMovimientos).not.toHaveBeenCalled();
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "CANCELADO", motivoCancelacion: "Se arrepintio" });
  });

  it("si hay que preguntar y no se eligio, no cancela", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));
    configuracion.decidirDevolucion.mockRejectedValue(new ErrorValidacion("Indica si se devuelve"));

    await expect(
      pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", motivoCancelacion: "Se arrepintio" })
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repo.actualizar).not.toHaveBeenCalled();
    expect(stock.revertirMovimientos).not.toHaveBeenCalled();
  });

  it("un pedido PENDIENTE no desconto nada: se cancela sin consultar la configuracion", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "PENDIENTE" }));

    await pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", motivoCancelacion: "Se arrepintio" });

    expect(configuracion.decidirDevolucion).not.toHaveBeenCalled();
    expect(stock.revertirMovimientos).not.toHaveBeenCalled();
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "CANCELADO", motivoCancelacion: "Se arrepintio" });
  });

  it("si la devolucion falla, el pedido no queda cancelado (misma transaccion)", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));
    configuracion.decidirDevolucion.mockResolvedValue(true);
    stock.revertirMovimientos.mockRejectedValue(new Error("lock"));

    await expect(pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", devolverStock: true, motivoCancelacion: "Se arrepintio" })).rejects.toThrow(
      "lock"
    );
    expect(repo.actualizar).not.toHaveBeenCalled();
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

describe("pedidosService.actualizarEstado (fecha de entrega prometida)", () => {
  const fecha = new Date("2026-09-30T03:00:00Z");

  it.each(["PENDIENTE", "CONFIRMADO", "LISTO"] as const)("la cambia o la borra en un pedido %s", async (estado) => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: estado }));

    await pedidosService.actualizarEstado(1n, { fechaEntrega: fecha });
    await pedidosService.actualizarEstado(1n, { fechaEntrega: null });

    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { fechaEntrega: fecha });
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { fechaEntrega: null });
  });

  it.each(["ENTREGADO", "CANCELADO"] as const)("no la cambia en un pedido %s", async (estado) => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: estado }));

    await expect(pedidosService.actualizarEstado(1n, { fechaEntrega: fecha })).rejects.toBeInstanceOf(ErrorConflicto);
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

  it("descuenta en orden de item para que los locks no se crucen entre transacciones", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: [detalle(11n, 9n, 1), detalle(12n, 3n, 1), detalle(13n, 5n, 1)] }));

    await pedidosService.confirmar(1n);

    expect(stock.registrarEgreso.mock.calls.map(([, input]) => input.idItemCatalogo)).toEqual([3n, 5n, 9n]);
  });

  it("no cambia el estado si falla el egreso de stock", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: [detalle(11n, 2n, 3)] }));
    stock.registrarEgreso.mockRejectedValue(new ErrorConflicto("Stock insuficiente para realizar la operacion"));

    await expect(pedidosService.confirmar(1n)).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe("pedidosService.presentar (costos)", () => {
  const conCostos = () =>
    pedido({
      detalles: [
        {
          ...detalle(1n, 2n, 3, 30),
          costoUnitario: dec(4),
          itemCatalogo: { idItemCatalogo: 2n, nombre: "Vela", precio: dec(10), costo: dec(4) }
        }
      ] as never
    });

  it("sin permiso saca el costo de cada linea y el del item, y deja precios y totales", () => {
    const presentado = pedidosService.presentar(conCostos(), false)!;
    const linea = presentado.detalles[0] as Record<string, unknown>;

    expect(linea).not.toHaveProperty("costoUnitario");
    expect(linea.itemCatalogo).not.toHaveProperty("costo");
    expect(linea.itemCatalogo).toMatchObject({ nombre: "Vela" });
    expect(linea).toHaveProperty("precioUnitario");
  });

  it("con permiso devuelve el pedido tal cual", () => {
    const original = conCostos();

    expect(pedidosService.presentar(original, true)).toBe(original);
  });

  it("tolera un pedido sin detalles cargados", () => {
    expect(ocultarCostos(pedido({ detalles: undefined as never })).detalles).toEqual([]);
  });
});


describe("pedidosService: repetir un pedido", () => {
  const original = () =>
    pedido({
      idPedido: 7n,
      numeroPedido: "PED-000007",
      estadoPedido: "ENTREGADO",
      idCliente: 3n,
      origenPedido: "INSTAGRAM",
      cliente: { nombre: "Ana", apellido: "Diaz" },
      detalles: [
        { ...detalle(1n, 100n, 2, 2000), idPedido: 7n, precioUnitario: dec(1000), nombreItemSnapshot: "Maceta (vieja)" },
        { ...detalle(2n, 200n, 1, 500), idPedido: 7n, precioUnitario: dec(500), nombreItemSnapshot: "Vela" },
        { ...detalle(3n, 300n, 4, 400), idPedido: 7n, precioUnitario: dec(100), nombreItemSnapshot: "Llavero" }
      ]
    } as never);
  const item = (id: bigint, nombre: string, precio: number | null, activo = true, costo = 100) =>
    ({ idItemCatalogo: id, nombre, precio: precio === null ? null : dec(precio), costo: dec(costo), activo }) as never;

  it("la vista previa usa el precio de hoy y marca lo que no se puede repetir, sin crear nada", async () => {
    repo.obtenerPorId.mockResolvedValue(original());
    repo.obtenerItemsCatalogo.mockResolvedValue([item(100n, "Maceta", 1200), item(200n, "Vela", 500, false)]);

    const vista = await pedidosService.prepararRepeticion(7n);

    expect(vista.lineas.map((linea) => [linea.nombre, linea.disponible, linea.motivo, linea.precioHoy?.toString()])).toEqual([
      ["Maceta", true, null, "1200"],
      ["Vela", false, "El item esta inactivo", undefined],
      ["Llavero", false, "El item ya no existe", undefined]
    ]);
    expect(vista.total.toString()).toBe("2400");
    expect(vista.lineas[0]).not.toHaveProperty("item");
    expect(repo.crear).not.toHaveBeenCalled();
    expect(repo.agregarDetalle).not.toHaveBeenCalled();
  });

  it("repetir crea un pedido pendiente con las lineas disponibles, precio y costo de hoy", async () => {
    repo.obtenerPorId.mockImplementation((async (_tx: unknown, id: bigint) =>
      id === 7n ? original() : pedido({ idPedido: 8n, detalles: [detalle(9n, 100n, 2, 2400)] })) as never);
    repo.obtenerItemsCatalogo.mockResolvedValue([item(100n, "Maceta", 1200, true, 350), item(200n, "Vela", null)]);
    repo.obtenerCliente.mockResolvedValue({ idCliente: 3n } as never);
    repo.crear.mockResolvedValue({ idPedido: 8n } as never);
    repo.actualizar.mockResolvedValue({ idPedido: 8n } as never);

    await pedidosService.repetir(7n);

    expect(repo.crear).toHaveBeenCalledWith(tx, {
      idCliente: 3n,
      origenPedido: "INSTAGRAM",
      observacionesInternas: "Repetido de PED-000007"
    });
    expect(repo.agregarDetalle).toHaveBeenCalledTimes(1);
    expect(repo.agregarDetalle).toHaveBeenCalledWith(tx, {
      idPedido: 8n,
      idItemCatalogo: 100n,
      nombreItemSnapshot: "Maceta",
      cantidad: dec(2),
      precioUnitario: dec(1200),
      costoUnitario: dec(350),
      subtotal: dec(2400)
    });
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 8n, { subtotal: dec(2400), total: dec(2400) });
    expect(stock.registrarEgreso).not.toHaveBeenCalled();
  });

  it("si ninguna linea se puede repetir, no crea el pedido", async () => {
    repo.obtenerPorId.mockResolvedValue(original());
    repo.obtenerItemsCatalogo.mockResolvedValue([item(100n, "Maceta", null), item(200n, "Vela", 500, false)]);

    await expect(pedidosService.repetir(7n)).rejects.toThrow("Ninguna linea del pedido se puede repetir");
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("un pedido que no existe es 404", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(pedidosService.prepararRepeticion(99n)).rejects.toThrow("Pedido no encontrado");
    await expect(pedidosService.repetir(99n)).rejects.toThrow("Pedido no encontrado");
  });
});

// Historial de estados (#99): un evento por cambio real, en la misma transaccion.
describe("pedidosService: historial de estados", () => {
  const configuracion = vi.mocked(configuracionService);

  it("el alta guarda quien lo cargo y escribe un evento sin estado anterior hacia PENDIENTE", async () => {
    repo.obtenerCliente.mockResolvedValue({ idCliente: 7n } as never);
    repo.crear.mockResolvedValue({ idPedido: 42n } as never);

    await pedidosService.crear({ idCliente: 7n, origenPedido: "WEB" }, 9n);

    expect(repo.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ idUsuarioAlta: 9n }));
    expect(repo.registrarCambioEstado).toHaveBeenCalledTimes(1);
    expect(repo.registrarCambioEstado).toHaveBeenCalledWith(tx, {
      idPedido: 42n,
      estadoAnterior: null,
      estadoNuevo: "PENDIENTE",
      idUsuario: 9n,
      origen: "PANTALLA"
    });
  });

  it("confirmar escribe un evento PENDIENTE -> CONFIRMADO con el usuario", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ detalles: [detalle(10n, 3n, 1)] }));

    await pedidosService.confirmar(1n, 9n);

    expect(repo.registrarCambioEstado).toHaveBeenCalledTimes(1);
    expect(repo.registrarCambioEstado).toHaveBeenCalledWith(tx, {
      idPedido: 1n,
      estadoAnterior: "PENDIENTE",
      estadoNuevo: "CONFIRMADO",
      idUsuario: 9n,
      origen: "PANTALLA"
    });
  });

  it.each([
    ["CONFIRMADO", "EN_PREPARACION"],
    ["CONFIRMADO", "LISTO"],
    ["EN_PREPARACION", "LISTO"],
    ["LISTO", "EN_PREPARACION"]
  ] as const)("%s -> %s escribe exactamente un evento, con el pedido bloqueado", async (actual, nuevo) => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: actual }));

    await pedidosService.actualizarEstado(1n, { estadoPedido: nuevo }, 9n);

    expect(vi.mocked(pagosRepository.bloquearPedido)).toHaveBeenCalledWith(tx, 1n);
    expect(repo.registrarCambioEstado).toHaveBeenCalledTimes(1);
    expect(repo.registrarCambioEstado).toHaveBeenCalledWith(tx, {
      idPedido: 1n,
      estadoAnterior: actual,
      estadoNuevo: nuevo,
      idUsuario: 9n,
      origen: "PANTALLA",
      observacion: undefined
    });
  });

  it("un cambio que no mueve el estado no escribe evento", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "LISTO" }));

    await pedidosService.actualizarEstado(1n, { estadoPedido: "LISTO", observacionesInternas: "Avisar antes" }, 9n);
    await pedidosService.actualizarEstado(1n, { fechaEntrega: new Date("2026-10-20T03:00:00Z") }, 9n);

    expect(repo.actualizar).toHaveBeenCalledTimes(2);
    expect(repo.registrarCambioEstado).not.toHaveBeenCalled();
  });

  it("si el evento no se puede escribir, el error corta la transaccion del cambio", async () => {
    repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "CONFIRMADO" }));
    repo.registrarCambioEstado.mockRejectedValue(new Error("historial"));

    await expect(pedidosService.actualizarEstado(1n, { estadoPedido: "LISTO" }, 9n)).rejects.toThrow("historial");
    // El estado y el evento van en la misma transaccion (tx): Postgres revierte el cambio.
    expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "LISTO" });
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
  });

  it("si el estado cambio mientras tanto, 409 y no escribe nada", async () => {
    repo.obtenerPorId
      .mockResolvedValueOnce(pedido({ estadoPedido: "CONFIRMADO" }))
      .mockResolvedValueOnce(pedido({ estadoPedido: "CANCELADO" }));

    await expect(pedidosService.actualizarEstado(1n, { estadoPedido: "LISTO" })).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
    expect(repo.registrarCambioEstado).not.toHaveBeenCalled();
  });

  describe("cancelar", () => {
    it.each(["PENDIENTE", "CONFIRMADO"] as const)("sin motivo da 400 en motivoCancelacion y no cambia nada (%s)", async (actual) => {
      repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: actual }));

      for (const motivoCancelacion of [undefined, "   "]) {
        const error = await pedidosService
          .actualizarEstado(1n, { estadoPedido: "CANCELADO", devolverStock: false, motivoCancelacion })
          .catch((e) => e);

        expect(error).toBeInstanceOf(ErrorValidacion);
        expect(error.detalles).toEqual([expect.objectContaining({ path: "motivoCancelacion" })]);
      }
      expect(configuracion.decidirDevolucion).not.toHaveBeenCalled();
      expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it("guarda el motivo en el pedido y en la observacion del evento", async () => {
      repo.obtenerPorId.mockResolvedValue(pedido({ estadoPedido: "PENDIENTE" }));

      await pedidosService.actualizarEstado(1n, { estadoPedido: "CANCELADO", motivoCancelacion: "  No llego a pagar  " }, 9n);

      expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "CANCELADO", motivoCancelacion: "No llego a pagar" });
      expect(repo.registrarCambioEstado).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ estadoAnterior: "PENDIENTE", estadoNuevo: "CANCELADO", observacion: "No llego a pagar" })
      );
    });
  });

  describe("entregar", () => {
    const confirmado = (fechaConfirmacion: Date) => pedido({ estadoPedido: "LISTO", fechaConfirmacion } as never);

    it("sin fecha guarda hoy en hora de Argentina, tambien a las 23:30 de Argentina", async () => {
      repo.obtenerPorId.mockResolvedValue(confirmado(new Date("2026-10-01T15:00:00Z")));
      // 9-oct 23:30 en Argentina = 10-oct 02:30 UTC: el dia es el 9.
      const ahora = new Date("2026-10-10T02:30:00Z");

      await pedidosService.actualizarEstado(1n, { estadoPedido: "ENTREGADO" }, 9n, ahora);

      const nueveDeOctubre = new Date("2026-10-09T03:00:00Z");
      expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "ENTREGADO", fechaEntregaReal: nueveDeOctubre });
      expect(repo.registrarCambioEstado).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ estadoAnterior: "LISTO", estadoNuevo: "ENTREGADO", observacion: "Entregado el 09/10/2026" })
      );
    });

    it("guarda la fecha que indica quien lo marca", async () => {
      repo.obtenerPorId.mockResolvedValue(confirmado(new Date("2026-10-01T15:00:00Z")));
      const fechaEntregaReal = new Date("2026-10-05T03:00:00Z");

      await pedidosService.actualizarEstado(1n, { estadoPedido: "ENTREGADO", fechaEntregaReal }, 9n, new Date("2026-10-10T15:00:00Z"));

      expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "ENTREGADO", fechaEntregaReal });
    });

    it.each([
      ["futura", "2026-10-11T03:00:00Z"],
      ["anterior a la confirmacion", "2026-09-30T03:00:00Z"]
    ])("una fecha %s da 400 en fechaEntregaReal", async (_caso, dia) => {
      repo.obtenerPorId.mockResolvedValue(confirmado(new Date("2026-10-01T15:00:00Z")));

      const error = await pedidosService
        .actualizarEstado(1n, { estadoPedido: "ENTREGADO", fechaEntregaReal: new Date(dia) }, 9n, new Date("2026-10-10T15:00:00Z"))
        .catch((e) => e);

      expect(error).toBeInstanceOf(ErrorValidacion);
      expect(error.detalles).toEqual([expect.objectContaining({ path: "fechaEntregaReal" })]);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it("el mismo dia de la confirmacion vale", async () => {
      repo.obtenerPorId.mockResolvedValue(confirmado(new Date("2026-10-01T22:00:00Z")));
      const fechaEntregaReal = new Date("2026-10-01T03:00:00Z");

      await pedidosService.actualizarEstado(1n, { estadoPedido: "ENTREGADO", fechaEntregaReal }, 9n, new Date("2026-10-10T15:00:00Z"));

      expect(repo.actualizar).toHaveBeenCalledWith(tx, 1n, { estadoPedido: "ENTREGADO", fechaEntregaReal });
    });
  });

  it("repetir guarda quien cargo el pedido nuevo", async () => {
    repo.obtenerPorId.mockResolvedValue(
      pedido({ idCliente: 7n, origenPedido: "WEB", detalles: [detalle(10n, 3n, 1)] } as never)
    );
    repo.obtenerItemsCatalogo.mockResolvedValue([
      { idItemCatalogo: 3n, nombre: "Vela", activo: true, precio: dec(100), costo: dec(40) }
    ] as never);
    repo.obtenerCliente.mockResolvedValue({ idCliente: 7n } as never);
    repo.crear.mockResolvedValue({ idPedido: 50n } as never);
    repo.actualizar.mockResolvedValue({ idPedido: 50n } as never);

    await pedidosService.repetir(1n, 9n);

    expect(repo.crear).toHaveBeenCalledWith(tx, expect.objectContaining({ idUsuarioAlta: 9n }));
    expect(repo.registrarCambioEstado).toHaveBeenCalledWith(tx, expect.objectContaining({ idPedido: 50n, estadoNuevo: "PENDIENTE", idUsuario: 9n }));
  });

  it("listarHistorial: 404 si el pedido no existe", async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    await expect(pedidosService.listarHistorial(1n)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
