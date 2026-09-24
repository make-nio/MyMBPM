// Respaldo y restauracion a mano (ver docs/respaldos.md). Se corre con tsx:
//
//   npm run respaldo:respaldar --workspace @myfirstproject/api -- --base <url> --archivo respaldo.ndjson.gz
//   npm run respaldo:restaurar --workspace @myfirstproject/api -- --base <url local> --archivo respaldo.ndjson.gz [--habilitar <usuario>]
//   npm run respaldo:probar-ciclo --workspace @myfirstproject/api -- --base <url local>
//
// restaurar y probar-ciclo solo aceptan una base local: restaurar sobre produccion (Neon) es una
// decision de Mariano en el momento y se hace a mano, como explica el documento.
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { generarRespaldo, restaurarRespaldo } from "../src/respaldo/respaldo";
import { COLUMNAS_OMITIDAS, TABLAS_RESPALDO } from "../src/respaldo/tablas";

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const RAIZ_API = path.resolve(__dirname, "..");

function exigirBaseLocal(url: string) {
  const host = new URL(url).hostname;

  if (!HOSTS_LOCALES.has(host)) {
    throw new Error(`Solo se restaura en una base local; la URL apunta a "${host}".`);
  }
}

function cliente(url: string) {
  return new PrismaClient({ datasources: { db: { url } } });
}

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function respaldar(url: string, archivo: string) {
  const base = cliente(url);

  try {
    const { manifiesto, contenido, bytesSinComprimir } = await generarRespaldo(base);
    writeFileSync(archivo, contenido);
    console.log(`Respaldo en ${archivo}: ${kb(contenido.byteLength)} (${kb(bytesSinComprimir)} sin comprimir).`);
    console.table(manifiesto.tablas);
    return manifiesto;
  } finally {
    await base.$disconnect();
  }
}

async function restaurar(url: string, archivo: string, habilitar?: string) {
  exigirBaseLocal(url);
  const base = cliente(url);

  try {
    const { manifiesto, restauradas } = await restaurarRespaldo(base, readFileSync(archivo));
    console.log(`Restaurado el respaldo del ${manifiesto.fecha} (migracion ${manifiesto.ultimaMigracion}).`);
    console.table(restauradas);

    if (habilitar) {
      const clave = process.env.CLAVE_NUEVA;
      if (!clave || clave.length < 8) {
        throw new Error("Para --habilitar defini CLAVE_NUEVA (8 caracteres o mas) en el entorno.");
      }
      const cambiados = await base.$executeRawUnsafe(
        `UPDATE "USUARIO" SET "CLAVE_HASH" = $1 WHERE lower("USUARIO") = lower($2)`,
        await bcrypt.hash(clave, 10),
        habilitar
      );
      console.log(cambiados === 1 ? `El usuario ${habilitar} ya puede ingresar.` : `No existe el usuario ${habilitar}.`);
    }
  } finally {
    await base.$disconnect();
  }
}

// Huella de cada tabla (sin las columnas omitidas) para comparar origen y copia fila por fila.
async function huellas(url: string) {
  const base = cliente(url);

  try {
    const resultado: Record<string, { filas: number; md5: string }> = {};
    for (const tabla of TABLAS_RESPALDO) {
      const [fila] = await base.$queryRawUnsafe<Array<{ filas: number; md5: string }>>(
        `SELECT count(*)::int AS filas,
                md5(COALESCE(string_agg((to_jsonb(t) - $1::text[])::text, '|' ORDER BY (to_jsonb(t) - $1::text[])::text), '')) AS md5
         FROM "${tabla}" t`,
        COLUMNAS_OMITIDAS[tabla] ?? []
      );
      resultado[tabla] = fila;
    }
    return resultado;
  } finally {
    await base.$disconnect();
  }
}

// Ciclo completo en local: respaldar la base, crear una vacia con las mismas migraciones,
// restaurar ahi y comparar tabla por tabla. La base temporal se borra al terminar.
async function probarCiclo(url: string) {
  exigirBaseLocal(url);
  const destino = new URL(url);
  destino.pathname = `${destino.pathname}_restaurada`;
  const nombreDestino = destino.pathname.slice(1);
  const administracion = new URL(url);
  administracion.pathname = "/postgres";
  const archivo = path.join(os.tmpdir(), `respaldo-ciclo-${process.pid}.ndjson.gz`);

  const admin = cliente(administracion.toString());
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${nombreDestino}" WITH (FORCE)`);
  await admin.$executeRawUnsafe(`CREATE DATABASE "${nombreDestino}"`);

  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: RAIZ_API,
      stdio: "inherit",
      env: { ...process.env, NETLIFY_DATABASE_URL: destino.toString(), NETLIFY_DATABASE_URL_UNPOOLED: destino.toString() }
    });

    const manifiesto = await respaldar(url, archivo);
    if (manifiesto.tablas.every((tabla) => tabla.filas === 0)) {
      throw new Error("La base de origen esta vacia: el ciclo no probaria nada.");
    }

    await restaurar(destino.toString(), archivo);

    const [antes, despues] = await Promise.all([huellas(url), huellas(destino.toString())]);
    console.table(TABLAS_RESPALDO.map((tabla) => ({ tabla, origen: antes[tabla].filas, restaurada: despues[tabla].filas })));
    const distintas = TABLAS_RESPALDO.filter(
      (tabla) => antes[tabla].filas !== despues[tabla].filas || antes[tabla].md5 !== despues[tabla].md5
    );

    if (distintas.length > 0) {
      throw new Error(`La base restaurada no coincide con el origen en: ${distintas.join(", ")}.`);
    }

    // La clave no viaja en el respaldo: con la copia nadie ingresa hasta que se lo habilite.
    const copia = cliente(destino.toString());
    try {
      const [{ total }] = await copia.$queryRawUnsafe<Array<{ total: number }>>(
        `SELECT count(*)::int AS total FROM "USUARIO" WHERE "CLAVE_HASH" LIKE '$2%'`
      );
      if (total !== 0) {
        throw new Error("La base restaurada tiene claves: el respaldo no deberia incluirlas.");
      }

      // Las secuencias quedan despues del ultimo id: el proximo alta no choca con lo restaurado.
      const [{ proximo, maximo }] = await copia.$queryRawUnsafe<Array<{ proximo: bigint; maximo: bigint | null }>>(
        `SELECT nextval(pg_get_serial_sequence('"PEDIDO"', 'ID_PEDIDO')) AS proximo, (SELECT max("ID_PEDIDO") FROM "PEDIDO") AS maximo`
      );
      if (maximo !== null && proximo <= maximo) {
        throw new Error(`La secuencia de PEDIDO quedo en ${proximo} y ya existe el ${maximo}.`);
      }
    } finally {
      await copia.$disconnect();
    }

    console.log("Ciclo de respaldo OK: origen y restaurada coinciden tabla por tabla.");
  } finally {
    rmSync(archivo, { force: true });
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${nombreDestino}" WITH (FORCE)`);
    await admin.$disconnect();
  }
}

async function principal() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      base: { type: "string" },
      archivo: { type: "string" },
      habilitar: { type: "string" }
    }
  });
  const [comando] = positionals;

  if (!values.base) {
    throw new Error("Falta --base <url de la base>.");
  }

  if (comando === "respaldar" && values.archivo) {
    await respaldar(values.base, values.archivo);
  } else if (comando === "restaurar" && values.archivo) {
    await restaurar(values.base, values.archivo, values.habilitar);
  } else if (comando === "probar-ciclo") {
    await probarCiclo(values.base);
  } else {
    throw new Error("Uso: respaldar|restaurar --base <url> --archivo <archivo>, o probar-ciclo --base <url local>.");
  }
}

principal().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
