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
    cancelarPedido: "PREGUNTAR",
    cancelarOrden: "NO_DEVOLVER",
    devolucionStock: "DEVOLVER",
    devolucionReintegro: "PREGUNTAR",
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
      cancelarPedido: "PREGUNTAR",
      cancelarOrden: "NO_DEVOLVER",
      devolucionStock: "DEVOLVER",
      devolucionReintegro: "PREGUNTAR",
      guardada: true
    });
  });

  it("en un preview con la tabla pero sin las columnas de la devolucion (#96): usa las de cancelar y no se guarda", async () => {
    repo.obtener.mockResolvedValue({ cancelarPedido: "DEVOLVER", cancelarOrden: "NO_DEVOLVER" } as never);

    expect(await configuracionService.obtener()).toEqual({
      cancelarPedido: "DEVOLVER",
      cancelarOrden: "NO_DEVOLVER",
      devolucionStock: "PREGUNTAR",
      devolucionReintegro: "PREGUNTAR",
      guardada: false
    });
  });

  it("un valor desconocido en la base se lee como PREGUNTAR", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedido: "AUTOMATICO" }));

    expect((await configuracionService.obtener()).cancelarPedido).toBe("PREGUNTAR");
  });

  it("sin la tabla (preview sin migrar) se comporta como antes: no pregunta y no devuelve", async () => {
    repo.obtener.mockResolvedValue(null);

    expect(await configuracionService.obtener()).toEqual({
      cancelarPedido: "NO_DEVOLVER",
      cancelarOrden: "NO_DEVOLVER",
      devolucionStock: "PREGUNTAR",
      devolucionReintegro: "PREGUNTAR",
      guardada: false
    });
  });
});

describe("configuracionService.decidirDevolucion", () => {
  it("con DEVOLVER devuelve, aunque quien cancela pida otra cosa", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarOrden: "DEVOLVER" }));

    expect(await configuracionService.decidirDevolucion("cancelarOrden", false)).toBe(true);
    expect(await configuracionService.decidirDevolucion("cancelarOrden", undefined)).toBe(true);
  });

  it("con NO_DEVOLVER no devuelve, aunque quien cancela lo pida", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedido: "NO_DEVOLVER" }));

    expect(await configuracionService.decidirDevolucion("cancelarPedido", true)).toBe(false);
    expect(await configuracionService.decidirDevolucion("cancelarPedido", undefined)).toBe(false);
  });

  it("con PREGUNTAR usa lo que elige quien cancela", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedido: "PREGUNTAR" }));

    expect(await configuracionService.decidirDevolucion("cancelarPedido", false)).toBe(false);
    expect(await configuracionService.decidirDevolucion("cancelarPedido", true)).toBe(true);
  });

  it("con PREGUNTAR, sin elegir, responde 400 en devolverStock", async () => {
    repo.obtener.mockResolvedValue(fila({ cancelarPedido: "PREGUNTAR" }));

    const error = await configuracionService.decidirDevolucion("cancelarPedido", undefined).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error.detalles).toEqual([{ path: "devolverStock", message: "Elegi si se devuelve el stock" }]);
  });

  it("en el reintegro de una devolucion, sin elegir, responde 400 en reintegrar", async () => {
    repo.obtener.mockResolvedValue(fila({ devolucionReintegro: "PREGUNTAR" }));

    const error = await configuracionService.decidirDevolucion("devolucionReintegro", undefined).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect(error.detalles).toEqual([{ path: "reintegrar", message: "Elegi si se reintegra la plata" }]);
  });

  it("sin la tabla no devuelve nada, como antes", async () => {
    repo.obtener.mockResolvedValue(null);

    expect(await configuracionService.decidirDevolucion("cancelarPedido", true)).toBe(false);
  });
});

describe("configuracionService.actualizar", () => {
  it("guarda y devuelve la configuracion nueva", async () => {
    repo.guardar.mockResolvedValue(fila());
    repo.obtener.mockResolvedValue(fila({ cancelarOrden: "DEVOLVER" }));

    const nueva = await configuracionService.actualizar({ cancelarOrden: "DEVOLVER" });

    expect(repo.guardar).toHaveBeenCalledWith({ cancelarOrden: "DEVOLVER" });
    expect(nueva.cancelarOrden).toBe("DEVOLVER");
  });

  it("sin la tabla responde 409 en vez de fallar con 500", async () => {
    repo.guardar.mockResolvedValue(null);

    await expect(configuracionService.actualizar({ cancelarPedido: "NO_DEVOLVER" })).rejects.toBeInstanceOf(ErrorConflicto);
  });
});
