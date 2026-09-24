import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { prisma } from "../../lib/prisma";
import { pedidosService } from "../pedidos/pedidos.service";

import { solicitudesEspecialesRepository } from "./solicitudes-especiales.repository";
import { solicitudesEspecialesService } from "./solicitudes-especiales.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

vi.mock("../pedidos/pedidos.service", () => ({
  pedidosService: { crearEnTransaccion: vi.fn() }
}));

vi.mock("./solicitudes-especiales.repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./solicitudes-especiales.repository")>()),
  solicitudesEspecialesRepository: {
    obtenerPorId: vi.fn(),
    actualizar: vi.fn(),
    crear: vi.fn(),
    obtenerCliente: vi.fn(),
    marcarConvertida: vi.fn()
  }
}));

const repo = vi.mocked(solicitudesEspecialesRepository);
const pedidos = vi.mocked(pedidosService);

function solicitud(overrides: Record<string, unknown> = {}) {
  return {
    idSolicitudEspecial: 9n,
    idCliente: 3n,
    nombreSolicitante: "Ana",
    descripcion: "Figura de 20 cm",
    estadoSolicitud: "APROBADA",
    idPedido: null,
    pedido: null,
    ...overrides
  } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: unknown) => unknown) =>
    callback(tx)) as never);
  repo.obtenerPorId.mockResolvedValue(solicitud());
  pedidos.crearEnTransaccion.mockResolvedValue({ idPedido: 50n, numeroPedido: "PED-000050" } as never);
  repo.marcarConvertida.mockResolvedValue(true);
});

describe("solicitudesEspecialesService.convertirEnPedido", () => {
  it("crea un pedido para el cliente y marca la solicitud en la misma transaccion", async () => {
    const pedido = await solicitudesEspecialesService.convertirEnPedido(9n);

    expect(pedidos.crearEnTransaccion).toHaveBeenCalledWith(tx, {
      idCliente: 3n,
      origenPedido: "MANUAL",
      observacionesCliente: "Figura de 20 cm",
      observacionesInternas: "Desde la solicitud especial #9 (Ana)"
    });
    expect(repo.marcarConvertida).toHaveBeenCalledWith(tx, 9n, 50n);
    expect(pedido).toEqual({ idPedido: 50n, numeroPedido: "PED-000050" });
  });

  it("si otra conversion gano la carrera, falla y no queda el pedido (rollback)", async () => {
    repo.marcarConvertida.mockResolvedValue(false);

    await expect(solicitudesEspecialesService.convertirEnPedido(9n)).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it.each([
    ["sin cliente", { idCliente: null }, /Asocia un cliente/],
    ["ya convertida", { idPedido: 50n, pedido: { numeroPedido: "PED-000050" }, estadoSolicitud: "CONVERTIDA_A_PEDIDO" }, /PED-000050/],
    ["rechazada", { estadoSolicitud: "RECHAZADA" }, /Solo se convierten/]
  ])("no convierte una solicitud %s", async (_caso, cambios, mensaje) => {
    repo.obtenerPorId.mockResolvedValue(solicitud(cambios));

    await expect(solicitudesEspecialesService.convertirEnPedido(9n)).rejects.toThrow(mensaje);
    expect(pedidos.crearEnTransaccion).not.toHaveBeenCalled();
  });

  it("recorta una descripcion mas larga que las observaciones del pedido", async () => {
    repo.obtenerPorId.mockResolvedValue(solicitud({ descripcion: "x".repeat(4000) }));

    await solicitudesEspecialesService.convertirEnPedido(9n);

    const observaciones = pedidos.crearEnTransaccion.mock.calls[0][1].observacionesCliente ?? "";
    expect(observaciones).toHaveLength(2000);
    expect(observaciones.endsWith("...")).toBe(true);
  });
});

describe("solicitudesEspecialesService: estado de una solicitud convertida", () => {
  it("no se marca como convertida a mano", async () => {
    await expect(solicitudesEspecialesService.cambiarEstado(9n, "CONVERTIDA_A_PEDIDO")).rejects.toThrow(/Convertir en pedido/);
    await expect(
      solicitudesEspecialesService.crear({ nombreSolicitante: "Ana", descripcion: "x", estadoSolicitud: "CONVERTIDA_A_PEDIDO" })
    ).rejects.toBeInstanceOf(ErrorConflicto);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it("una vez convertida no cambia mas de estado", async () => {
    repo.obtenerPorId.mockResolvedValue(solicitud({ idPedido: 50n, estadoSolicitud: "CONVERTIDA_A_PEDIDO" }));

    await expect(solicitudesEspecialesService.cambiarEstado(9n, "PENDIENTE")).rejects.toThrow(/ya se convirtio/);
    await expect(solicitudesEspecialesService.actualizar(9n, { estadoSolicitud: "APROBADA" })).rejects.toBeInstanceOf(
      ErrorConflicto
    );
  });

  it("el resto de los cambios de estado siguen igual", async () => {
    await solicitudesEspecialesService.cambiarEstado(9n, "RECHAZADA");

    expect(repo.actualizar).toHaveBeenCalledWith(prisma, 9n, { estadoSolicitud: "RECHAZADA" });
  });
});
