import { api, crearCliente, crearProductoConReceta, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Que hacer con el stock al cancelar algo que ya lo desconto (issue #89). La configuracion es
// global: cada prueba la fija al empezar y la deja en los valores iniciales al terminar.
const INICIAL = { cancelarPedido: "PREGUNTAR", cancelarOrden: "PREGUNTAR" };

test.afterEach(async () => {
  await api("PATCH", "/api/configuracion", INICIAL);
});

async function stockActual(idItemCatalogo: string, tipoStock: "PRODUCTO" | "INSUMO") {
  const stock = await api<{ stockActual: string }>(
    "GET",
    `/api/stock/actual?idItemCatalogo=${idItemCatalogo}&tipoStock=${tipoStock}`
  );
  return Number(stock.stockActual);
}

async function pedidoConfirmado(stockInicial: number, cantidad: number) {
  const cliente = await crearCliente(unico("PRUEBA-ClienteConfig"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdConfig"), 100, stockInicial);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  return { pedido, producto };
}

test("un administrador cambia la configuracion desde el menu y queda guardada", async ({ page }) => {
  await api("PATCH", "/api/configuracion", INICIAL);
  await page.goto("/panel");
  await page.getByRole("link", { name: "Configuracion" }).click();
  await expect(page).toHaveURL(/\/configuracion$/);

  const pedido = page.getByRole("region", { name: "Cancelar un pedido confirmado" });
  await expect(pedido.getByLabel("Al cancelar")).toHaveValue("PREGUNTAR");
  // Las tres opciones que pidio Mariano.
  await expect(pedido.getByLabel("Al cancelar").locator("option")).toHaveText([
    "Preguntar en el momento",
    "Devolver al stock, sin preguntar",
    "No devolver, sin preguntar"
  ]);

  await pedido.getByLabel("Al cancelar").selectOption("NO_DEVOLVER");
  await page.getByRole("button", { name: "Guardar configuracion" }).click();
  await expect(page.getByRole("status")).toHaveText("Configuracion guardada.");

  await page.reload();
  await expect(pedido.getByLabel("Al cancelar")).toHaveValue("NO_DEVOLVER");
  const orden = page.getByRole("region", { name: "Cancelar una orden en proceso" });
  await expect(orden.getByLabel("Al cancelar")).toHaveValue("PREGUNTAR");
});

test("en PREGUNTAR la API exige elegir y devuelve el stock solo si se pide", async () => {
  await api("PATCH", "/api/configuracion", INICIAL);

  const conDevolucion = await pedidoConfirmado(10, 4);
  expect(await stockActual(conDevolucion.producto.idItemCatalogo, "PRODUCTO")).toBe(6);
  await expect(
    api("PATCH", `/api/pedidos/${conDevolucion.pedido.idPedido}/estado`, { estadoPedido: "CANCELADO" })
  ).rejects.toThrow(/400/);
  await api("PATCH", `/api/pedidos/${conDevolucion.pedido.idPedido}/estado`, { estadoPedido: "CANCELADO", devolverStock: true });
  expect(await stockActual(conDevolucion.producto.idItemCatalogo, "PRODUCTO")).toBe(10);

  const sinDevolucion = await pedidoConfirmado(10, 4);
  await api("PATCH", `/api/pedidos/${sinDevolucion.pedido.idPedido}/estado`, { estadoPedido: "CANCELADO", devolverStock: false });
  expect(await stockActual(sinDevolucion.producto.idItemCatalogo, "PRODUCTO")).toBe(6);
});

test("con DEVOLVER o NO_DEVOLVER manda la configuracion, sin preguntar", async ({ page }) => {
  await api("PATCH", "/api/configuracion", { ...INICIAL, cancelarPedido: "DEVOLVER" });

  // Aunque se pida no devolver, sin preguntar decide la configuracion.
  const { pedido, producto } = await pedidoConfirmado(8, 3);
  await api("PATCH", `/api/pedidos/${pedido.idPedido}/estado`, { estadoPedido: "CANCELADO", devolverStock: false });
  expect(await stockActual(producto.idItemCatalogo, "PRODUCTO")).toBe(8);

  // Y en la orden en proceso, con NO_DEVOLVER, el modal solo lo avisa.
  await api("PATCH", "/api/configuracion", { ...INICIAL, cancelarOrden: "NO_DEVOLVER" });
  const { producto: llavero, insumo } = await crearProductoConReceta({
    producto: unico("PRUEBA-LlaveroConfig"),
    insumo: unico("PRUEBA-ResinaConfig"),
    cantidadRequerida: 2,
    stockInsumo: 10
  });
  const orden = await api<{ idOrdenProduccion: string }>("POST", "/api/produccion", { observaciones: "PRUEBA config" });
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/detalles`, { idItemCatalogoProducto: llavero.idItemCatalogo, cantidad: 1 });
  await api("POST", `/api/produccion/${orden.idOrdenProduccion}/iniciar`);

  await page.goto("/produccion?vista=tablero");
  await page.getByRole("button", { name: `Cancelar orden ${orden.idOrdenProduccion}` }).click();
  const modal = page.getByRole("dialog", { name: "Cancelar orden" });
  await expect(modal.getByTestId("orden-devolver-stock-automatico")).toHaveText(/no se devuelven al stock los insumos/);
  await expect(modal.getByRole("radio")).toHaveCount(0);
  await modal.getByRole("button", { name: "Cancelar orden" }).click();
  await expect(modal).toBeHidden();
  expect(await stockActual(insumo.idItemCatalogo, "INSUMO")).toBe(8);
});
