import { gunzipSync, gzipSync } from "node:zlib";

import { Prisma, PrismaClient } from "@prisma/client";

import { CLAVE_INHABILITADA, COLUMNAS_OMITIDAS, TABLAS_EXCLUIDAS, TABLAS_RESPALDO } from "./tablas";

// Respaldo logico de la base: un archivo de texto comprimido con gzip, una linea JSON por parte.
// La primera es el manifiesto; cada una de las siguientes, una tabla: {"tabla": "...", "filas": [...]}.
// Las filas las serializa Postgres (to_jsonb) y se restauran con jsonb_populate_recordset, sin
// pasar por JSON.parse de JavaScript: los BIGINT y DECIMAL llegan sin perder precision.

export const FORMATO = "mymbpm-respaldo";
export const VERSION_FORMATO = 1;

export type Manifiesto = {
  formato: typeof FORMATO;
  version: number;
  fecha: string;
  ultimaMigracion: string | null;
  tablas: Array<{ nombre: string; filas: number }>;
  columnasOmitidas: Record<string, string[]>;
};

type Base = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">;
type Tx = Pick<Prisma.TransactionClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

const citar = (identificador: string) => `"${identificador.replaceAll('"', '""')}"`;

async function tablasDeLaBase(tx: Tx) {
  const filas = await tx.$queryRawUnsafe<Array<{ nombre: string }>>(
    `SELECT table_name AS nombre FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`
  );
  return new Set(filas.map((fila) => fila.nombre));
}

// El respaldo tiene que cubrir todas las tablas: una tabla nueva sin respaldar se descubriria
// recien al necesitar el respaldo.
export function validarTablas(existentes: Set<string>) {
  const conocidas = new Set<string>([...TABLAS_RESPALDO, ...TABLAS_EXCLUIDAS]);
  const sinRespaldo = [...existentes].filter((tabla) => !conocidas.has(tabla));
  const faltantes = TABLAS_RESPALDO.filter((tabla) => !existentes.has(tabla));

  if (sinRespaldo.length > 0) {
    throw new Error(`Hay tablas que el respaldo no conoce: ${sinRespaldo.join(", ")}. Sumalas en respaldo/tablas.ts.`);
  }

  if (faltantes.length > 0) {
    throw new Error(`Faltan tablas en la base: ${faltantes.join(", ")}.`);
  }
}

async function ultimaMigracion(tx: Tx) {
  const filas = await tx.$queryRawUnsafe<Array<{ nombre: string }>>(
    `SELECT migration_name AS nombre FROM _prisma_migrations
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY migration_name DESC LIMIT 1`
  );
  return filas[0]?.nombre ?? null;
}

async function clavePrimaria(tx: Tx, tabla: string) {
  const filas = await tx.$queryRawUnsafe<Array<{ columna: string }>>(
    `SELECT a.attname AS columna FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    citar(tabla)
  );
  return filas.map((fila) => fila.columna);
}

// Lee todas las tablas en una misma foto de la base (REPEATABLE READ): el respaldo es consistente
// aunque alguien este cargando un pedido mientras corre.
export async function generarRespaldo(base: Base, ahora = new Date()) {
  return base.$transaction(
    async (tx) => {
      validarTablas(await tablasDeLaBase(tx));

      const lineas: string[] = [];
      const tablas: Manifiesto["tablas"] = [];

      for (const tabla of TABLAS_RESPALDO) {
        const orden = (await clavePrimaria(tx, tabla)).map((columna) => `t.${citar(columna)}`).join(", ");
        const [resultado] = await tx.$queryRawUnsafe<Array<{ linea: string; filas: number }>>(
          `SELECT json_build_object(
             'tabla', $1::text,
             'filas', COALESCE(jsonb_agg(to_jsonb(t) - $2::text[]${orden ? ` ORDER BY ${orden}` : ""}), '[]'::jsonb)
           )::text AS linea,
           count(*)::int AS filas
           FROM ${citar(tabla)} t`,
          tabla,
          COLUMNAS_OMITIDAS[tabla] ?? []
        );
        lineas.push(resultado.linea);
        tablas.push({ nombre: tabla, filas: resultado.filas });
      }

      const manifiesto: Manifiesto = {
        formato: FORMATO,
        version: VERSION_FORMATO,
        fecha: ahora.toISOString(),
        ultimaMigracion: await ultimaMigracion(tx),
        tablas,
        columnasOmitidas: COLUMNAS_OMITIDAS as Record<string, string[]>
      };

      const texto = [JSON.stringify(manifiesto), ...lineas].join("\n") + "\n";
      return { manifiesto, contenido: gzipSync(texto), bytesSinComprimir: Buffer.byteLength(texto) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000, maxWait: 10_000 }
  );
}

export function leerManifiesto(contenido: Buffer) {
  const texto = gunzipSync(contenido).toString("utf8");
  const [primera, ...resto] = texto.split("\n").filter((linea) => linea.length > 0);
  const manifiesto = JSON.parse(primera ?? "{}") as Manifiesto;

  if (manifiesto.formato !== FORMATO || manifiesto.version !== VERSION_FORMATO) {
    throw new Error("El archivo no es un respaldo de MyMBPM de una version conocida.");
  }

  return { manifiesto, lineas: resto };
}

// Solo el nombre de la tabla: las filas no se parsean en JavaScript.
function tablaDeLinea(linea: string) {
  const coincidencia = /^\{"tabla"\s*:\s*"([A-Z_]+)"/.exec(linea);

  if (!coincidencia) {
    throw new Error("Linea de tabla invalida en el respaldo.");
  }

  return coincidencia[1];
}

async function reiniciarSecuencias(tx: Tx, tabla: string) {
  const columnas = await tx.$queryRawUnsafe<Array<{ columna: string }>>(
    `SELECT column_name AS columna FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1
       AND (column_default LIKE 'nextval(%' OR is_identity = 'YES')`,
    tabla
  );

  for (const { columna } of columnas) {
    await tx.$queryRawUnsafe(
      `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${citar(columna)}) FROM ${citar(tabla)}), 0) + 1, false)`,
      citar(tabla),
      columna
    );
  }
}

// Restaura un respaldo en una base con el mismo esquema (misma ultima migracion) y sin datos.
// Todo en una transaccion: si algo falla, la base queda como estaba.
export async function restaurarRespaldo(base: Base, contenido: Buffer) {
  const { manifiesto, lineas } = leerManifiesto(contenido);

  return base.$transaction(
    async (tx) => {
      validarTablas(await tablasDeLaBase(tx));

      const migracion = await ultimaMigracion(tx);
      if (migracion !== manifiesto.ultimaMigracion) {
        throw new Error(
          `La base tiene la migracion ${migracion ?? "(ninguna)"} y el respaldo es de ${manifiesto.ultimaMigracion ?? "(ninguna)"}: ` +
            "migra la base a la misma version antes de restaurar."
        );
      }

      for (const tabla of TABLAS_RESPALDO) {
        const [{ hay }] = await tx.$queryRawUnsafe<Array<{ hay: boolean }>>(
          `SELECT EXISTS (SELECT 1 FROM ${citar(tabla)}) AS hay`
        );
        if (hay) {
          throw new Error(`La tabla ${tabla} ya tiene datos: la restauracion solo se hace sobre una base vacia.`);
        }
      }

      const porTabla = new Map(lineas.map((linea) => [tablaDeLinea(linea), linea]));
      const restauradas: Manifiesto["tablas"] = [];

      for (const tabla of TABLAS_RESPALDO) {
        const linea = porTabla.get(tabla);
        if (linea === undefined) {
          throw new Error(`El respaldo no tiene la tabla ${tabla}.`);
        }

        // Las columnas omitidas (la clave) se completan con un valor que no habilita el ingreso.
        const relleno = Object.fromEntries((COLUMNAS_OMITIDAS[tabla] ?? []).map((columna) => [columna, CLAVE_INHABILITADA]));
        const filas = await tx.$executeRawUnsafe(
          `INSERT INTO ${citar(tabla)}
           SELECT * FROM jsonb_populate_recordset(
             NULL::${citar(tabla)},
             (SELECT COALESCE(jsonb_agg(fila || $2::jsonb), '[]'::jsonb) FROM jsonb_array_elements(($1::jsonb)->'filas') fila)
           )`,
          linea,
          JSON.stringify(relleno)
        );
        await reiniciarSecuencias(tx, tabla);
        restauradas.push({ nombre: tabla, filas });
      }

      const esperadas = new Map(manifiesto.tablas.map((tabla) => [tabla.nombre, tabla.filas]));
      const distintas = restauradas.filter((tabla) => esperadas.get(tabla.nombre) !== tabla.filas);
      if (distintas.length > 0) {
        throw new Error(`No coinciden las filas restauradas de: ${distintas.map((tabla) => tabla.nombre).join(", ")}.`);
      }

      return { manifiesto, restauradas };
    },
    { timeout: 120_000, maxWait: 10_000 }
  );
}
