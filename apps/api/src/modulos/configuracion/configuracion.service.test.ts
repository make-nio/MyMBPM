import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";

import { configuracionRepository } from "./configuracion.repository";
import { configuracionService } from "./configuracion.service";

vi.mock("./configuracion.repository", () => ({
  configuracionRepository: {
    obtener: vi.fn(),
    guardar: vi.fn()
  }
}));

const repo = vi.mocked(configuracionRepository);

function fila(overrides: Record<string, unknown> = {}) {
  return {
    idConfiguracion: 1,
    cancelarPedidoModo: "PREGUNTAR",
    cancelarPedidoDevolver: true,
    cancelarOrdenModo: "AUTOMATICO",
    cancelarOrdenDevolver: false,
    fechaModificacion: new Date(),
    ...overrides
  } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("configuracionService.obtener", () => {
  it("devuelve la fila guardada", async () => {
    repo.obtener.mockResolvedValue(fila());

    expect(await configuracionService.obtener()).toEqual({
      cancelarPedidoModo: "PREGUNTAR",
      cancelarPedidoDevolver: true,
      cancelarOrdenModo: "AUTOMATICO",
      cancelarOrdenDevolver: false,
      guardada: true
    });
  });

  it("sin la tabla (preview sin migrar) se comporta como antes: no pregunta y no devuelve", async () => {
    repo.obtener.mockResolvedValue(null);

    expect(await configuracionService.obtener()).toEqual({
      cancelarPedidoModo: "AUTOMATICO",
      cancelarPedidoDevolver: false,
      cancelarOrdenModo: "AUTOMATICO",
      cancelarOrdenDevolver: false,
      guardada: false
    });
  });
});

describe("configuracionService.decidirDevolucion", () => {
  it("en AUTOMATICO manda la configuracion, aunque quien cancela pida otra cosa", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarOrdenModo: "AUTOMATICO", cancelarOrdenDevolver: true }));

    expect(await configuracionService.decidirDevolucion("cancelarOrden", false)).toBe(true);
    expect(await configuracionService.decidirDevolucion("cancelarOrden", undefined)).toBe(true);
  });

  it("en PREGUNTAR usa lo que elige quien cancela", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedidoModo: "PREGUNTAR", cancelarPedidoDevolver: true }));

    expect(await configuracionService.decidirDevolucion("cancelarPedido", false)).toBe(false);
    expect(await configuracionService.decidirDevolucion("cancelarPedido", true)).toBe(true);
  });

  it("en PREGUNTAR, sin elegir, responde 400 en devolverStock", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedidoModo: "PREGUNTAR" }));

    const error = await configuracionService.decidirDevolucion("cancelarPedido", undefined).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error.detalles).toEqual([{ path: "devolverStock", message: "Elegi si se devuelve el stock" }]);
  });

  it("sin la tabla no devuelve nada, como antes", async () => {
    repo.obtener.mockResolvedValue(null);

    expect(await configuracionService.decidirDevolucion("cancelarPedido", true)).toBe(false);
  });
});

describe("configuracionService.actualizar", () => {
  it("guarda y devuelve la configuracion nueva", async () => {
    repo.guardar.mockResolvedValue(fila());
    repo.obtener.mockResolvedValue(fila({ cancelarOrdenModo: "PREGUNTAR" }));

    const nueva = await configuracionService.actualizar({ cancelarOrdenModo: "PREGUNTAR" });

    expect(repo.guardar).toHaveBeenCalledWith({ cancelarOrdenModo: "PREGUNTAR" });
    expect(nueva.cancelarOrdenModo).toBe("PREGUNTAR");
  });

  it("sin la tabla responde 409 en vez de fallar con 500", async () => {
    repo.guardar.mockResolvedValue(null);

    await expect(configuracionService.actualizar({ cancelarPedidoDevolver: false })).rejects.toBeInstanceOf(ErrorConflicto);
  });
});
