import { beforeEach, describe, expect, it, vi } from "vitest";

import { saludRepository } from "./salud.repository";
import { saludService } from "./salud.service";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

vi.mock("./salud.repository", () => ({
  saludRepository: { consultarBase: vi.fn() }
}));

const repo = vi.mocked(saludRepository);

function relojFijo(...marcas: number[]) {
  return () => marcas.shift() ?? 0;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("saludService.revisarBase", () => {
  it("con la base respondiendo informa latencia y ultima migracion", async () => {
    repo.consultarBase.mockResolvedValue({ ultimaMigracion: "20260924104242_sesiones_usuario" });

    const estado = await saludService.revisarBase(5000, relojFijo(100, 142.6));

    expect(estado).toEqual({ estado: "ok", latenciaMs: 43, ultimaMigracion: "20260924104242_sesiones_usuario" });
  });

  it("sin migraciones aplicadas devuelve null, no falla", async () => {
    repo.consultarBase.mockResolvedValue({ ultimaMigracion: null });

    expect(await saludService.revisarBase()).toMatchObject({ estado: "ok", ultimaMigracion: null });
  });

  it("un error de la base no sale con su mensaje: motivo generico y la causa aparte", async () => {
    const causa = new Error("Can't reach database server at `ep-secreto.neon.tech`");
    repo.consultarBase.mockRejectedValue(causa);

    const estado = await saludService.revisarBase();

    expect(estado).toMatchObject({ estado: "error", motivo: "La base respondio con un error", latenciaMs: null });
    expect(estado.estado === "error" && estado.causa).toBe(causa);
    expect(JSON.stringify({ ...estado, causa: undefined })).not.toContain("neon");
  });

  it("si la base no contesta a tiempo lo informa sin esperar de mas", async () => {
    vi.useFakeTimers();
    repo.consultarBase.mockReturnValue(new Promise(() => undefined));

    const pendiente = saludService.revisarBase(5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await pendiente).toMatchObject({ estado: "error", motivo: "La base no respondio en 5 s" });
    vi.useRealTimers();
  });
});
