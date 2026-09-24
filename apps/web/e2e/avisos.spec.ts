import { api, crearCategoria, crearCliente, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// Dia de Argentina (AAAA-MM-DD) a `dias` de hoy, como lo espera la API.
function diaDesdeHoy(dias: number) {
  const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
}

// Pedido con entrega prometida. Se cancela al terminar la prueba: si quedaran abiertos, se
// acumulan con cada corrida (o repeticion) y desplazan a los de otras pruebas de las listas de
// entregas del panel, que muestran solo las mas urgentes (entregas.spec).
const creados: string[] = [];
async function pedidoConEntrega(idCliente: string, dias: number) {
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente, origenPedido: "WHATSAPP", fechaEntrega: diaDesdeHoy(dias) });
  creados.push(pedido.idPedido);
}

test.afterEach(async () => {
  for (const idPedido of creados.splice(0)) {
    await api("PATCH", `/api/pedidos/${idPedido}/estado`, { estadoPedido: "CANCELADO" });
  }
});

test("la campanita avisa stock bajo y entregas de hoy o atrasadas, y lleva a su pantalla", async ({ page }) => {
  const nombre = unico("PRUEBA-Aviso");
  const { idCategoria } = await crearCategoria(`${nombre}-cat`);
  await crearItem({ idCategoria, nombre, tipoItem: "INSUMO", stockMinimo: 5 });
  const { idCliente } = await crearCliente(unico("PRUEBA-ClienteAviso"));
  await pedidoConEntrega(idCliente, 0);
  await pedidoConEntrega(idCliente, -2);

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
  await pedidoConEntrega(idCliente, 0);

  await page.goto("/clientes");
  await page.getByRole("button", { name: /^Avisos: \d+/ }).click();
  await page.getByRole("region", { name: "Avisos" }).getByRole("link", { name: /entregas? para hoy/ }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("region", { name: "Entregas de esta semana" })).toBeVisible();
});
