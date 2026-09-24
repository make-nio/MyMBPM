import { beforeEach, describe, expect, it, vi } from "vitest";

import { AlmacenRespaldos } from "./almacen";
import { generarRespaldo } from "./respaldo";
import { ejecutarRespaldoDiario } from "./respaldo-diario";

vi.mock("../lib/prisma", () => ({ prisma: {} }));
vi.mock("./respaldo", () => ({ generarRespaldo: vi.fn() }));

const generar = vi.mocked(generarRespaldo);

describe("ejecutarRespaldoDiario", () => {
  const orden: string[] = [];
  const almacen = {
    set: vi.fn(async (clave: string) => orden.push(`set ${clave}`)),
    list: vi.fn(async () => {
      orden.push("list");
      return { blobs: Array.from({ length: 15 }, (_, dia) => ({ key: `respaldo-2026-09-${String(dia + 1).padStart(2, "0")}T07-00-00Z.ndjson.gz` })) };
    }),
    delete: vi.fn(async (clave: string) => orden.push(`delete ${clave}`))
  } satisfies AlmacenRespaldos;

  beforeEach(() => {
    orden.length = 0;
    generar.mockResolvedValue({
      manifiesto: {
        formato: "mymbpm-respaldo",
        version: 1,
        fecha: "2026-09-24T07:00:00.000Z",
        ultimaMigracion: "20260924081000_solicitud_convertida_en_pedido",
        tablas: [
          { nombre: "USUARIO", filas: 2 },
          { nombre: "PEDIDO", filas: 5 }
        ],
        columnasOmitidas: { USUARIO: ["CLAVE_HASH"] }
      },
      contenido: Buffer.from("comprimido"),
      bytesSinComprimir: 1000
    });
  });

  it("guarda el respaldo nuevo con su metadata antes de borrar los viejos", async () => {
    const resultado = await ejecutarRespaldoDiario(almacen, new Date("2026-09-24T07:00:00Z"));

    expect(resultado.clave).toBe("respaldo-2026-09-24T07-00-00Z.ndjson.gz");
    expect(orden[0]).toBe("set respaldo-2026-09-24T07-00-00Z.ndjson.gz");
    expect(orden.slice(1)).toEqual(["list", "delete respaldo-2026-09-01T07-00-00Z.ndjson.gz"]);
    expect(almacen.set).toHaveBeenCalledWith(expect.any(String), expect.any(ArrayBuffer), {
      metadata: expect.objectContaining({ bytes: 10, bytesSinComprimir: 1000, filas: 7 })
    });
  });

  it("si falla el respaldo no borra nada", async () => {
    generar.mockRejectedValue(new Error("sin conexion"));

    await expect(ejecutarRespaldoDiario(almacen)).rejects.toThrow("sin conexion");
    expect(almacen.delete).not.toHaveBeenCalled();
  });
});
