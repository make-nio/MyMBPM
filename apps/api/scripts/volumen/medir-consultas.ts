// Mide las consultas principales con EXPLAIN ANALYZE sobre una base local con volumen.
//
//   NETLIFY_DATABASE_URL=postgresql://...localhost.../mymbpm_indices \
//     npx tsx scripts/volumen/medir-consultas.ts [--sembrar]
//
// --sembrar carga scripts/volumen/sembrar-volumen.sql (la base tiene que estar vacia y migrada).
// Cada escenario llama al service o repository real; se captura el SQL que genera Prisma y se
// corre con EXPLAIN (ANALYZE, BUFFERS) tres veces: sale la mediana del tiempo y los nodos que
// recorren tablas enteras (Seq Scan) o que ordenan en memoria (Sort). Se niega si la base no es
// local. Resultados y decisiones: docs/indices.md.
import { execFileSync } from "node:child_process";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const url = process.env.NETLIFY_DATABASE_URL ?? "";

if (!url || !HOSTS_LOCALES.has(new URL(url).hostname)) {
  throw new Error(`Solo se mide sobre una base local; NETLIFY_DATABASE_URL apunta a "${url ? new URL(url).hostname : "(vacia)"}".`);
}

type Consulta = { sql: string; params: string };
const capturadas: Consulta[] = [];
const cliente = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
cliente.$on("query", (evento) => capturadas.push({ sql: evento.query, params: evento.params }));
// Los modulos usan el cliente global (src/lib/prisma.ts): se instala antes de importarlos.
(globalThis as { prisma?: PrismaClient }).prisma = cliente;

// Reemplaza $1, $2... por literales: EXPLAIN no acepta parametros sueltos y los literales sin
// tipo dejan que Postgres infiera el mismo tipo que con el parametro.
function conLiterales({ sql, params }: Consulta) {
  const valores = JSON.parse(params) as unknown[];

  return valores.reduceRight<string>((texto, valor, indice) => {
    const literal =
      valor === null
        ? "NULL"
        : typeof valor === "number" || typeof valor === "boolean"
          ? String(valor)
          : `'${String(typeof valor === "object" ? JSON.stringify(valor) : valor).replace(/'/g, "''")}'`;
    return texto.replace(new RegExp(`\\$${indice + 1}(?![0-9])`, "g"), literal);
  }, sql);
}

type Nodo = { "Node Type": string; "Relation Name"?: string; "Actual Rows"?: number; "Actual Loops"?: number; "Index Name"?: string; Plans?: Nodo[] };

function recorrer(nodo: Nodo, hallazgos: string[]) {
  if (nodo["Node Type"] === "Seq Scan") {
    hallazgos.push(`Seq Scan ${nodo["Relation Name"]}`);
  }

  if (nodo["Node Type"] === "Sort" || nodo["Node Type"] === "Incremental Sort") {
    hallazgos.push(`Sort (${nodo["Actual Rows"]} filas)`);
  }

  for (const hijo of nodo.Plans ?? []) {
    recorrer(hijo, hallazgos);
  }
}

async function explicar(consulta: Consulta) {
  const tiempos: number[] = [];
  let hallazgos: string[] = [];

  for (let vez = 0; vez < 3; vez += 1) {
    const [fila] = await cliente.$queryRawUnsafe<Array<{ "QUERY PLAN": Array<{ Plan: Nodo; "Execution Time": number }> }>>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${conLiterales(consulta)}`
    );
    const plan = fila["QUERY PLAN"][0];
    tiempos.push(plan["Execution Time"]);
    hallazgos = [];
    recorrer(plan.Plan, hallazgos);
  }

  tiempos.sort((a, b) => a - b);
  return { ms: tiempos[1], hallazgos: [...new Set(hallazgos)] };
}

const IGNORAR = /^(BEGIN|COMMIT|ROLLBACK|SELECT 1|SELECT pg_advisory|SELECT to_regclass)/i;

async function medir(nombre: string, escenario: () => Promise<unknown>) {
  capturadas.length = 0;
  await escenario();
  const consultas = capturadas.filter((consulta) => !IGNORAR.test(consulta.sql.trim()));
  let total = 0;
  const detalle: string[] = [];

  for (const consulta of consultas) {
    const { ms, hallazgos } = await explicar(consulta);
    total += ms;
    const tabla = /FROM "public"\."([A-Z_]+)"/.exec(consulta.sql)?.[1] ?? /FROM "([A-Z_]+)"/.exec(consulta.sql)?.[1] ?? "?";
    if (ms >= 1 || hallazgos.length > 0) {
      detalle.push(`${tabla} ${ms.toFixed(1)} ms${hallazgos.length ? ` [${hallazgos.join(", ")}]` : ""}`);
    }
  }

  console.log(`| ${nombre} | ${consultas.length} | ${total.toFixed(1)} | ${detalle.join("<br>") || "-"} |`);
}

async function main() {
  if (process.argv.includes("--sembrar")) {
    execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", "-f", path.join(__dirname, "sembrar-volumen.sql")], { stdio: "inherit" });
  }

  const { pedidosService } = await import("../../src/modulos/pedidos/pedidos.service");
  const { clientesService } = await import("../../src/modulos/clientes/clientes.service");
  const { busquedaService } = await import("../../src/modulos/busqueda/busqueda.service");
  const { panelService } = await import("../../src/modulos/panel/panel.service");
  const { reportesService } = await import("../../src/modulos/reportes/reportes.service");
  const { stockService } = await import("../../src/modulos/stock/stock.service");
  const { auditoriaService } = await import("../../src/modulos/auditoria/auditoria.service");
  const { itemsCatalogoService } = await import("../../src/modulos/items-catalogo/items-catalogo.service");

  const [unCliente] = await cliente.$queryRaw<Array<{ id: bigint }>>`
    SELECT "ID_CLIENTE" AS id FROM "PEDIDO" GROUP BY 1 ORDER BY count(*) DESC LIMIT 1`;
  const [unProducto] = await cliente.$queryRaw<Array<{ id: bigint }>>`
    SELECT "ID_ITEM_CATALOGO" AS id FROM "ESTADO_STOCK" GROUP BY 1 ORDER BY count(*) DESC LIMIT 1`;
  const hoy = new Date();
  const haceUnMes = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  const abiertos = ["PENDIENTE", "CONFIRMADO", "EN_PREPARACION", "LISTO"];

  console.log("| Escenario | Consultas | Total (ms) | Consultas de 1 ms o mas / Seq Scan / Sort |");
  console.log("| --- | --- | --- | --- |");

  await medir("Pedidos: primera pagina", () => pedidosService.listar({ limit: 51, offset: 0 }));
  await medir("Pedidos: pagina 100", () => pedidosService.listar({ limit: 51, offset: 5000 }));
  await medir("Pedidos: filtro estado Confirmado", () => pedidosService.listar({ estadoPedido: "CONFIRMADO", limit: 51, offset: 0 }));
  await medir("Pedidos: alta del ultimo mes", () => pedidosService.listar({ desde: haceUnMes, hasta: hoy, limit: 51, offset: 0 }));
  await medir("Pedidos: de un cliente (ficha)", () => pedidosService.listar({ idCliente: unCliente.id, limit: 51, offset: 0 }));
  await medir("Pedidos: detalle", () => pedidosService.obtenerPorId(unCliente.id));
  await medir("Clientes: primera pagina", () => clientesService.listar({ limit: 51, offset: 0 }));
  await medir("Clientes: buscar \"gomez\"", () => clientesService.listar({ busqueda: "gomez", limit: 51, offset: 0 }));
  await medir("Clientes: resumen (ficha)", () => clientesService.obtenerResumen(unCliente.id));
  await medir("Items: buscar \"impreso 12\"", () => itemsCatalogoService.listar({ busqueda: "impreso 12", limit: 51, offset: 0 }));
  await medir("Busqueda global \"perez\"", () => busquedaService.buscar("perez", { verCostos: true }));
  await medir("Busqueda global \"PED-0123\"", () => busquedaService.buscar("PED-0123", { verCostos: true }));
  await medir("Panel (Dashboard)", () => panelService.obtenerResumen({ limite: 5 }, { verCostos: true }));
  await medir("Avisos del encabezado", async () => {
    // Lo mismo que panelService.obtenerAvisos (#68): existencias bajo minimo y dos conteos.
    await stockService.obtenerExistencias(cliente, { activo: true, soloBajoMinimo: true });
    await cliente.pedido.count({ where: { activo: true, estadoPedido: { in: abiertos }, fechaEntrega: { lt: hoy } } });
  });
  await medir("Stock: existencias (pagina)", () => stockService.obtenerExistencias(cliente, { activo: true, limit: 51, offset: 0 }));
  await medir("Stock: movimientos de un item", () => stockService.obtenerHistorial(cliente, { idItemCatalogo: unProducto.id, limit: 51, offset: 0 }));
  await medir("Reportes: ventas del mes", () => reportesService.ventasDelMes({}));
  await medir("Reportes: ventas por mes (12)", () => reportesService.ventasPorMes());
  await medir("Auditoria: historial de un item", () =>
    auditoriaService.listar({ entidad: "ITEM_CATALOGO", idEntidad: unProducto.id, limit: 51, offset: 0 })
  );
  await medir("Auditoria: precio y costo de un item", () =>
    // Lo mismo que auditoriaRepository.listarConCampos (#69).
    cliente.auditoriaCambio.findMany({
      where: {
        entidad: "ITEM_CATALOGO",
        idEntidad: unProducto.id,
        OR: ["precio", "costo"].map((campo) => ({ cambios: { array_contains: [{ campo }] } }))
      },
      orderBy: { idAuditoriaCambio: "desc" },
      take: 51
    })
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => cliente.$disconnect());
