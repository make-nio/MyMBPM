import { gzipSync } from "node:zlib";

import { describe, expect, it, vi } from "vitest";

import { AlmacenRespaldos, claveDeRespaldo, podarRespaldos } from "./almacen";
import { FORMATO, leerManifiesto, validarTablas, VERSION_FORMATO } from "./respaldo";
import { TABLAS_EXCLUIDAS, TABLAS_RESPALDO } from "./tablas";

vi.mock("../lib/prisma", () => ({ prisma: {} }));

describe("validarTablas", () => {
  const todas = new Set<string>([...TABLAS_RESPALDO, ...TABLAS_EXCLUIDAS]);

  it("acepta la base con todas las tablas conocidas", () => {
    expect(() => validarTablas(todas)).not.toThrow();
  });

  it("falla si aparece una tabla que el respaldo no conoce", () => {
    expect(() => validarTablas(new Set([...todas, "TABLA_NUEVA"]))).toThrow(/TABLA_NUEVA/);
  });

  it("falla si falta una tabla que se respalda", () => {
    const sinPedido = new Set([...todas].filter((tabla) => tabla !== "PEDIDO"));
    expect(() => validarTablas(sinPedido)).toThrow(/PEDIDO/);
  });
});

describe("leerManifiesto", () => {
  it("lee el manifiesto y deja las lineas de tablas sin parsear", () => {
    const manifiesto = { formato: FORMATO, version: VERSION_FORMATO, tablas: [] };
    const contenido = gzipSync(`${JSON.stringify(manifiesto)}\n{"tabla" : "USUARIO", "filas" : [{"ID_USUARIO": 12345678901234567890}]}\n`);

    const leido = leerManifiesto(contenido);

    expect(leido.manifiesto.formato).toBe(FORMATO);
    // El BIGINT queda como texto: lo interpreta Postgres al restaurar.
    expect(leido.lineas).toEqual(['{"tabla" : "USUARIO", "filas" : [{"ID_USUARIO": 12345678901234567890}]}']);
  });

  it("rechaza un archivo que no es un respaldo conocido", () => {
    expect(() => leerManifiesto(gzipSync('{"formato":"otro"}\n'))).toThrow(/respaldo de MyMBPM/);
  });
});

describe("claveDeRespaldo", () => {
  it("usa la fecha UTC sin dos puntos, para que ordenar por nombre sea ordenar por fecha", () => {
    expect(claveDeRespaldo(new Date("2026-09-24T07:00:00.123Z"))).toBe("respaldo-2026-09-24T07-00-00Z.ndjson.gz");
  });
});

describe("podarRespaldos", () => {
  function almacenCon(claves: string[]) {
    return {
      set: vi.fn(),
      list: vi.fn(async () => ({ blobs: claves.map((key) => ({ key })) })),
      delete: vi.fn(async () => undefined)
    } satisfies AlmacenRespaldos;
  }

  it("deja las ultimas copias y borra las mas viejas", async () => {
    const claves = Array.from({ length: 16 }, (_, dia) => claveDeRespaldo(new Date(Date.UTC(2026, 8, dia + 1, 7))));
    const almacen = almacenCon([...claves].reverse());

    const borrados = await podarRespaldos(almacen, 14);

    expect(borrados).toEqual([claves[0], claves[1]]);
    expect(almacen.delete).toHaveBeenCalledTimes(2);
  });

  it("no toca otros blobs ni borra si hay menos copias que el limite", async () => {
    const almacen = almacenCon(["otro-archivo", claveDeRespaldo(new Date("2026-09-24T07:00:00Z"))]);

    expect(await podarRespaldos(almacen, 14)).toEqual([]);
    expect(almacen.delete).not.toHaveBeenCalled();
  });
});
