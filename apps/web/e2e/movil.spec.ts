import type { Page } from "@playwright/test";

import { crearCliente, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Corre solo en el proyecto "movil" (375 x 812, ver playwright.config.ts).

const pantallas = [
  "/panel",
  "/categorias",
  "/clientes",
  "/items-catalogo",
  "/solicitudes-especiales",
  "/usuarios",
  "/pedidos",
  "/produccion",
  "/stock",
  "/reportes",
  "/ayuda"
];

async function anchoDePagina(page: Page) {
  return page.evaluate(() => ({
    contenido: document.documentElement.scrollWidth,
    pantalla: document.documentElement.clientWidth
  }));
}

for (const ruta of pantallas) {
  test(`${ruta} entra a lo ancho del celular`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
    // Esperar a que termine de cargar la lista: una tabla ancha es lo que suele desbordar.
    await expect(page.getByText(/^Cargando/)).toHaveCount(0);

    const { contenido, pantalla } = await anchoDePagina(page);
    expect(contenido).toBeLessThanOrEqual(pantalla);
  });
}

test("el menu se abre con el boton y se cierra al navegar", async ({ page }) => {
  await page.goto("/panel");
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  const boton = page.getByRole("button", { name: "Menu", exact: true });

  await expect(menu).toBeHidden();
  await expect(boton).toHaveAttribute("aria-expanded", "false");

  await boton.click();
  await expect(menu).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar menu" })).toHaveAttribute("aria-expanded", "true");

  await menu.getByRole("link", { name: "Clientes" }).click();
  await expect(page).toHaveURL(/\/clientes/);
  await expect(menu).toBeHidden();
});

test("las filas se leen como tarjetas con el nombre de cada dato", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteMovil");
  await crearCliente(cliente);
  await page.goto("/clientes");

  const fila = page.getByRole("row").filter({ hasText: cliente });
  await expect(fila).toBeVisible();
  const celda = fila.getByRole("cell").first();
  // El rotulo sale de data-label via ::before: se comprueba el atributo y que la celda no se corte.
  await expect(celda).toHaveAttribute("data-label", /.+/);
  const caja = await celda.boundingBox();
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(375);
});

test("pedido completo desde el celular: el detalle queda a la vista", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteMovil");
  await crearCliente(cliente);
  const producto = await crearProductoConStock(unico("PRUEBA-ProdMovil"), 500, 4);

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo pedido" });
  await modal.getByLabel("Cliente", { exact: true }).selectOption({ label: cliente });
  await modal.getByLabel("Origen").selectOption("INSTAGRAM");
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();

  // El detalle queda debajo de la lista: al crearlo o elegirlo, la pantalla baja hasta el.
  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel.getByRole("heading").first()).toBeInViewport();

  await panel.getByRole("button", { name: "Agregar item" }).click();
  const linea = page.getByRole("dialog", { name: "Agregar item" });
  const opcion = linea.getByRole("option", { name: new RegExp(`^${producto.nombre} `) });
  await linea.getByLabel("Item", { exact: true }).selectOption((await opcion.getAttribute("value")) ?? "");
  await linea.getByLabel("Cantidad").fill("2");
  await linea.getByRole("button", { name: "Guardar item" }).click();
  await expect(linea).toBeHidden();

  await panel.getByRole("button", { name: "Confirmar pedido" }).click();
  const confirmacion = page.getByRole("dialog", { name: "Confirmar pedido" });
  await confirmacion.getByRole("button", { name: "Confirmar y descontar stock" }).click();
  await expect(confirmacion).toBeHidden();
  await expect(panel.getByTestId("estado-pedido")).toHaveText("Confirmado");

  const { contenido, pantalla } = await anchoDePagina(page);
  expect(contenido).toBeLessThanOrEqual(pantalla);

  // El comprobante tambien entra a lo ancho del celular.
  await panel.getByRole("link", { name: "Comprobante" }).click();
  await expect(page.getByRole("article", { name: /^Comprobante del pedido/ })).toBeVisible();
  const comprobante = await anchoDePagina(page);
  expect(comprobante.contenido).toBeLessThanOrEqual(comprobante.pantalla);
});

test("la busqueda global entra a lo ancho del celular", async ({ page }) => {
  const nombre = unico("PRUEBA-ClienteConNombreLargoSinEspaciosParaBuscar");
  await crearCliente(nombre);
  await page.goto("/panel");
  await page.getByRole("button", { name: /^Buscar/ }).click();
  const dialogo = page.getByRole("dialog", { name: "Buscar" });
  await dialogo.getByLabel("Buscar pedidos, clientes e items").fill(nombre);
  await expect(dialogo.getByRole("region", { name: "Clientes" })).toBeVisible();

  const caja = await dialogo.boundingBox();
  const cerrar = await dialogo.getByRole("button", { name: "Cerrar" }).boundingBox();
  expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(375);
  expect((cerrar?.x ?? 0) + (cerrar?.width ?? 0)).toBeLessThanOrEqual((caja?.x ?? 0) + (caja?.width ?? 0));
});

test("los avisos del encabezado entran a lo ancho del celular", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("button", { name: /^Avisos:/ }).click();
  const avisos = page.getByRole("region", { name: "Avisos" });
  await expect(avisos).toBeVisible();

  const caja = await avisos.boundingBox();
  expect(caja?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(375);
});

test("el tablero de produccion entra a lo ancho del celular", async ({ page }) => {
  await page.goto("/produccion?vista=tablero");
  await expect(page.getByRole("region", { name: "Pendientes", exact: true })).toBeVisible();
  await expect(page.getByText("Cargando...")).toHaveCount(0);

  const { contenido, pantalla } = await anchoDePagina(page);
  expect(contenido).toBeLessThanOrEqual(pantalla);
});

test("en stock, elegir un item lleva a sus movimientos", async ({ page }) => {
  const producto = await crearProductoConStock(unico("PRUEBA-ProdMovil"), 500, 4);
  await page.goto("/stock");
  await page.getByLabel("Buscar item").fill(producto.nombre);

  await page
    .getByRole("row")
    .filter({ hasText: producto.nombre })
    .getByRole("button", { name: "Movimientos" })
    .click();

  const panel = page.getByRole("region", { name: `Stock de ${producto.nombre}` });
  await expect(panel.getByRole("heading").first()).toBeInViewport();
});
