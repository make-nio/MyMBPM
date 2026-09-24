import { api, crearCategoria, crearCliente, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// Dia de Argentina (AAAA-MM-DD) a `dias` de hoy, como lo espera la API.
function diaDesdeHoy(dias: number) {
  const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
}

test("la campanita avisa stock bajo y entregas de hoy o atrasadas, y lleva a su pantalla", async ({ page }) => {
  const nombre = unico("PRUEBA-Aviso");
  const { idCategoria } = await crearCategoria(`${nombre}-cat`);
  await crearItem({ idCategoria, nombre, tipoItem: "INSUMO", stockMinimo: 5 });
  const { idCliente } = await crearCliente(unico("PRUEBA-ClienteAviso"));
  await api("POST", "/api/pedidos", { idCliente, origenPedido: "WHATSAPP", fechaEntrega: diaDesdeHoy(0) });
  await api("POST", "/api/pedidos", { idCliente, origenPedido: "WHATSAPP", fechaEntrega: diaDesdeHoy(-2) });

  await page.goto("/pedidos");
  const boton = page.getByRole("button", { name: /^Avisos: \d+/ });
  await expect(boton).toBeVisible();
  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");

  const avisos = page.getByRole("region", { name: "Avisos" });
  await expect(avisos.getByRole("link", { name: /entregas? para hoy/ })).toBeVisible();
  await expect(avisos.getByRole("link", { name: /entregas? atrasadas?/ })).toBeVisible();

  // Escape cierra y devuelve el foco al boton.
  await page.keyboard.press("Escape");
  await expect(avisos).toBeHidden();
  await expect(boton).toBeFocused();

  await boton.click();
  await avisos.getByRole("link", { name: /items? bajo el minimo/ }).click();
  await expect(page).toHaveURL(/\/stock\?bajoMinimo=1$/);
  await expect(avisos).toBeHidden();
  await expect(page.getByLabel(/Solo bajo minimo/)).toBeChecked();
  await page.getByLabel("Buscar item").fill(nombre);
  await expect(page.getByRole("row").filter({ hasText: nombre })).toContainText("Bajo minimo");
});

test("las entregas del aviso llevan al panel", async ({ page }) => {
  const { idCliente } = await crearCliente(unico("PRUEBA-ClienteAvisoPanel"));
  await api("POST", "/api/pedidos", { idCliente, origenPedido: "WHATSAPP", fechaEntrega: diaDesdeHoy(0) });

  await page.goto("/clientes");
  await page.getByRole("button", { name: /^Avisos: \d+/ }).click();
  await page.getByRole("region", { name: "Avisos" }).getByRole("link", { name: /entregas? para hoy/ }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("region", { name: "Entregas de esta semana" })).toBeVisible();
});
