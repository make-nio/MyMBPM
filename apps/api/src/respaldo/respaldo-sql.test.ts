import { gunzipSync, gzipSync } from "node:zlib";

import { describe, expect, it, vi } from "vitest";

import { FORMATO, generarRespaldo, restaurarRespaldo, VERSION_FORMATO } from "./respaldo";
import { CLAVE_INHABILITADA, TABLAS_EXCLUIDAS, TABLAS_RESPALDO } from "./tablas";

const MIGRACION = "20260924081000_solicitud_convertida_en_pedido";

// Cliente simulado: responde a cada consulta segun su texto. Las consultas reales se prueban en
// el ciclo contra Postgres (npm run respaldo:probar-ciclo).
function baseSimulada(opciones: { migracion?: string; conDatos?: string; filasInsertadas?: number } = {}) {
  const ejecutadas: Array<{ sql: string; parametros: unknown[] }> = [];
  const tx = {
    $queryRawUnsafe: vi.fn(async (sql: string, ...parametros: unknown[]) => {
      ejecutadas.push({ sql, parametros });
      if (sql.includes("information_schema.tables")) {
        return [...TABLAS_RESPALDO, ...TABLAS_EXCLUIDAS].map((nombre) => ({ nombre }));
      }
      if (sql.includes("_prisma_migrations")) {
        return [{ nombre: opciones.migracion ?? MIGRACION }];
      }
      if (sql.includes("pg_index")) {
        return [{ columna: "ID" }];
      }
      if (sql.includes("json_build_object")) {
        return [{ linea: `{"tabla" : "${parametros[0]}", "filas" : [{"ID": 1}]}`, filas: 1 }];
      }
      if (sql.includes("EXISTS")) {
        return [{ hay: sql.includes(`"${opciones.conDatos}"`) }];
      }
      if (sql.includes("information_schema.columns")) {
        return [{ columna: "ID" }];
      }
      return [];
    }),
    $executeRawUnsafe: vi.fn(async (sql: string, ...parametros: unknown[]) => {
      ejecutadas.push({ sql, parametros });
      return opciones.filasInsertadas ?? 1;
    })
  };
  const base = {
    ...tx,
    $transaction: vi.fn(async (fn: (cliente: typeof tx) => unknown) => fn(tx))
  };
  return { base: base as never, ejecutadas };
}

async function respaldoDePrueba() {
  const { base } = baseSimulada();
  return (await generarRespaldo(base, new Date("2026-09-24T07:00:00Z"))).contenido;
}

describe("generarRespaldo", () => {
  it("arma el manifiesto y una linea por tabla, en el orden de dependencias", async () => {
    const { base, ejecutadas } = baseSimulada();

    const { manifiesto, contenido } = await generarRespaldo(base, new Date("2026-09-24T07:00:00Z"));
    const lineas = gunzipSync(contenido).toString("utf8").trimEnd().split("\n");

    expect(manifiesto).toMatchObject({ formato: FORMATO, version: VERSION_FORMATO, ultimaMigracion: MIGRACION });
    expect(manifiesto.tablas.map((tabla) => tabla.nombre)).toEqual([...TABLAS_RESPALDO]);
    expect(JSON.parse(lineas[0])).toEqual(manifiesto);
    expect(lineas).toHaveLength(TABLAS_RESPALDO.length + 1);
    // La clave del usuario se saca en la consulta: nunca llega al archivo.
    const usuario = ejecutadas.find((consulta) => consulta.sql.includes("json_build_object") && consulta.parametros[0] === "USUARIO");
    expect(usuario?.parametros[1]).toEqual(["CLAVE_HASH"]);
  });
});

describe("restaurarRespaldo", () => {
  it("inserta cada tabla completando la clave con un valor inhabilitado y reinicia las secuencias", async () => {
    const contenido = await respaldoDePrueba();
    const { base, ejecutadas } = baseSimulada();

    const { restauradas } = await restaurarRespaldo(base, contenido);

    expect(restauradas.map((tabla) => tabla.nombre)).toEqual([...TABLAS_RESPALDO]);
    const insertUsuario = ejecutadas.find((consulta) => consulta.sql.includes('INSERT INTO "USUARIO"'));
    expect(JSON.parse(insertUsuario?.parametros[1] as string)).toEqual({ CLAVE_HASH: CLAVE_INHABILITADA });
    expect(ejecutadas.filter((consulta) => consulta.sql.includes("setval"))).toHaveLength(TABLAS_RESPALDO.length);
  });

  it("no restaura si la base esta en otra migracion", async () => {
    const contenido = await respaldoDePrueba();
    const { base } = baseSimulada({ migracion: "20260101000000_otra" });

    await expect(restaurarRespaldo(base, contenido)).rejects.toThrow(/migra la base a la misma version/);
  });

  it("no restaura sobre una base con datos", async () => {
    const contenido = await respaldoDePrueba();
    const { base, ejecutadas } = baseSimulada({ conDatos: "PEDIDO" });

    await expect(restaurarRespaldo(base, contenido)).rejects.toThrow(/PEDIDO ya tiene datos/);
    expect(ejecutadas.some((consulta) => consulta.sql.includes("INSERT"))).toBe(false);
  });

  it("falla si las filas insertadas no coinciden con el manifiesto", async () => {
    const contenido = await respaldoDePrueba();
    const { base } = baseSimulada({ filasInsertadas: 0 });

    await expect(restaurarRespaldo(base, contenido)).rejects.toThrow(/No coinciden las filas/);
  });

  it("falla si al respaldo le falta una tabla", async () => {
    const texto = gunzipSync(await respaldoDePrueba()).toString("utf8");
    const sinPedido = texto
      .split("\n")
      .filter((linea) => !linea.startsWith('{"tabla" : "PEDIDO"'))
      .join("\n");
    const { base } = baseSimulada();

    await expect(restaurarRespaldo(base, gzipSync(sinPedido))).rejects.toThrow(/no tiene la tabla PEDIDO/);
  });
});
