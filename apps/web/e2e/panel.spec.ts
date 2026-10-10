import { LIMITES } from "../../api/src/compartido/validaciones/esquemas-comunes";

import type { Page } from "@playwright/test";

import { api, ajustarStock, crearCategoria, crearCliente, crearItem, crearProductoConReceta, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

async function valorIndicador(page: Page, titulo: string) {
  const indicador = page.getByRole("link", { name: new RegExp(`^${titulo}: \\d+$`) });
  await expect(indicador).toBeVisible();
  const etiqueta = (await indicador.getAttribute("aria-label")) ?? "";
  return Number(etiqueta.split(": ")[1]);
}

test("pedidos: el pendiente aparece para confirmar y, al confirmarse, pasa a entregar", async ({ page }) => {
  await page.goto("/panel");
  const pendientesAntes = await valorIndicador(page, "Pedidos pendientes");
  const porEntregarAntes = await valorIndicador(page, "Pedidos por entregar");

  const cliente = await crearCliente(unico("PRUEBA-ClientePanel"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdPanel"), 100, 5);
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "WHATSAPP"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 2 });

  await page.reload();
  expect(await valorIndicador(page, "Pedidos pendientes")).toBe(pendientesAntes + 1);
  await expect(page.getByRole("region", { name: "Para confirmar" })).toContainText(pedido.numeroPedido);

  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  await page.reload();
  expect(await valorIndicador(page, "Pedidos pendientes")).toBe(pendientesAntes);
  expect(await valorIndicador(page, "Pedidos por entregar")).toBe(porEntregarAntes + 1);
  await expect(page.getByRole("region", { name: "Para entregar" })).toContainText(pedido.numeroPedido);

  // La confirmacion descuenta stock y aparece entre los ultimos movimientos.
  const movimientos = page.getByRole("region", { name: "Ultimos movimientos" });
  await expect(movimientos.getByRole("listitem").filter({ hasText: producto.nombre }).first()).toContainText(
    /Egreso pedido -2 · queda 3/
  );
});

test("produccion en curso y stock para reponer", async ({ page }) => {
  await page.goto("/panel");
  const enProcesoAntes = await valorIndicador(page, "Ordenes en proceso");
  const stockBajoAntes = await valorIndicador(page, "Stock bajo");

  const { producto } = await crearProductoConReceta({
    producto: unico("PRUEBA-ProdOrdenPanel"),
    insumo: unico("PRUEBA-InsumoPanel"),
    cantidadRequerida: 1,
    stockInsumo: 10
  });
  const orden = await api<{ idOrdenProduccion: string }>("POST", "/api/produccion", {});
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/detalles`, {
    idItemCatalogoProducto: producto.idItemCatalogo,
    cantidad: 3
  });
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/iniciar`);

  // Muy por debajo del minimo: queda primero en "Reponer" (los mas urgentes primero). El minimo
  // supera en uno al faltante mas urgente que ya hay en la base (la de E2E se reutiliza entre
  // corridas y otras pruebas dejan faltantes), sin pasar el tope de la API.
  const resumen = await api<{ stockBajo: { items: Array<{ stockMinimo: number; stockActual: string }> } }>("GET", "/api/panel/resumen");
  const masUrgente = resumen.stockBajo.items[0];
  const minimo = (masUrgente ? masUrgente.stockMinimo - Number(masUrgente.stockActual) : 0) + 2;
  expect(minimo, "la base de E2E llego al tope de stockMinimo: recreala").toBeLessThanOrEqual(LIMITES.stockMinimo);
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatPanel"));
  const faltante = await crearItem({ idCategoria, nombre: unico("PRUEBA-Faltante"), tipoItem: "INSUMO", stockMinimo: minimo });
  await ajustarStock(faltante.idItemCatalogo, 1, "INSUMO");

  await page.reload();
  expect(await valorIndicador(page, "Ordenes en proceso")).toBe(enProcesoAntes + 1);
  expect(await valorIndicador(page, "Stock bajo")).toBe(stockBajoAntes + 1);

  await expect(page.getByRole("region", { name: "En produccion" })).toContainText(
    new RegExp(`Orden #${orden.idOrdenProduccion}\\s*3 x ${producto.nombre}`)
  );
  await expect(page.getByRole("region", { name: "Reponer" }).getByRole("listitem").first()).toContainText(
    new RegExp(`${faltante.nombre}\\s*1 de minimo ${minimo}`)
  );

  // Cierra la orden para no dejarla en proceso en la base de E2E.
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/finalizar`);
});

test("los indicadores llevan a la pantalla de cada modulo", async ({ page }) => {
  await page.goto("/panel");

  await page.getByRole("link", { name: /^Stock bajo: \d+$/ }).click();
  await expect(page).toHaveURL(/\/stock$/);
});

// Franja "Hoy" (#101): el resumen del dia lo arma el servidor; la pantalla muestra sus frases.
test("la franja Hoy muestra el resumen del dia, coincide con el panel y la campanita, y cada frase lleva a su lista", async ({ page }) => {
  // Algo seguro para confirmar y para reponer.
  const cliente = await crearCliente(unico("PRUEBA-ClienteHoy"));
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatHoy"));
  const faltante = await crearItem({ idCategoria, nombre: unico("PRUEBA-FaltaHoy"), tipoItem: "INSUMO", stockMinimo: 2 });
  await ajustarStock(faltante.idItemCatalogo, 1, "INSUMO");
  await api("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });

  type Hoy = {
    frases: string[];
    pedidosParaConfirmar: { cantidad: number };
    entregasAtrasadas: { cantidad: number };
    entregasDeHoy: { cantidad: number };
    paraReponer: { cantidad: number };
  };
  const [hoy, avisos, resumen] = await Promise.all([
    api<Hoy>("GET", "/api/panel/hoy"),
    api<{ stockBajo: number; entregasAtrasadas: number; entregasHoy: number }>("GET", "/api/panel/avisos"),
    api<{ pedidos: { pendientes: { total: number } }; stockBajo: { total: number } }>("GET", "/api/panel/resumen?limite=5")
  ]);
  // Los mismos numeros que el panel y la campanita.
  expect(hoy.pedidosParaConfirmar.cantidad).toBe(resumen.pedidos.pendientes.total);
  expect(hoy.paraReponer.cantidad).toBe(resumen.stockBajo.total);
  expect(hoy.paraReponer.cantidad).toBe(avisos.stockBajo);
  expect(hoy.entregasAtrasadas.cantidad).toBe(avisos.entregasAtrasadas);
  expect(hoy.entregasDeHoy.cantidad).toBe(avisos.entregasHoy);
  // Sin plata ni costos.
  expect(JSON.stringify(hoy)).not.toMatch(/costo|ganancia|monto|precio|total/i);

  await page.goto("/panel");
  const franja = page.getByRole("region", { name: "Hoy" });
  for (const frase of hoy.frases) {
    await expect(franja.getByRole("link", { name: frase })).toBeVisible();
  }

  await franja.getByRole("link", { name: /pedidos? para confirmar$/ }).click();
  await expect(page).toHaveURL(/\/pedidos\?estado=PENDIENTE$/);
  await expect(page.getByLabel("Filtrar por estado")).toHaveValue("PENDIENTE");

  await page.goto("/panel");
  await franja.getByRole("link", { name: /para reponer$/ }).click();
  await expect(page).toHaveURL(/\/stock\?bajoMinimo=1$/);
});

test("la franja Hoy sin pendientes dice que no hay nada", async ({ page }) => {
  await page.route("**/api/panel/hoy", (ruta) =>
    ruta.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          fecha: "2026-10-10",
          pedidosParaConfirmar: { cantidad: 0, primeros: [] },
          entregasAtrasadas: { cantidad: 0, primeros: [] },
          entregasDeHoy: { cantidad: 0, primeros: [] },
          paraReponer: { cantidad: 0, primeros: [] },
          frases: []
        }
      })
    })
  );

  await page.goto("/panel");
  await expect(page.getByRole("region", { name: "Hoy" })).toContainText("Nada pendiente para hoy");
});
