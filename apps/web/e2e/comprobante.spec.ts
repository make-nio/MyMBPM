import { api, ajustarStock, crearCategoria, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// Pedido con costo cargado y las dos observaciones: el comprobante no puede mostrar ni el costo
// ni las observaciones internas, aunque lo abra un administrador (a quien la API le manda costos).
async function prepararPedido() {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatComprobante"));
  const producto = await crearItem({
    idCategoria,
    nombre: unico("PRUEBA-Maceta"),
    tipoItem: "PRODUCTO",
    precio: 1500,
    costo: 400
  });
  await ajustarStock(producto.idItemCatalogo, 5);
  const nombreCliente = unico("PRUEBA-ClienteComprobante");
  const cliente = await api<{ idCliente: string }>("POST", "/api/clientes", {
    nombre: nombreCliente,
    telefono: "11 5555-0000",
    localidad: "Quilmes"
  });
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "WHATSAPP",
    observacionesCliente: "Color verde agua",
    observacionesInternas: "PRUEBA-nota-interna-no-imprimir",
    fechaEntrega: "2030-01-15"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 3 });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);

  return { idPedido: pedido.idPedido, numeroPedido: pedido.numeroPedido, producto, nombreCliente };
}

test("comprobante: se abre desde el pedido, sin costos ni notas internas, con la leyenda", async ({ page }) => {
  const { idPedido, numeroPedido, producto, nombreCliente } = await prepararPedido();

  await page.goto(`/pedidos?pedido=${idPedido}`);
  const panel = page.getByRole("region", { name: `Pedido ${numeroPedido}` });
  // El detalle, para un administrador, si muestra el costo: el comprobante no.
  await expect(panel.getByTestId("costo-pedido")).toHaveText(/1\.200,00/);
  await panel.getByRole("link", { name: "Comprobante" }).click();

  await expect(page).toHaveURL(new RegExp(`/pedidos/comprobante/?\\?pedido=${idPedido}$`));
  const comprobante = page.getByRole("article", { name: `Comprobante del pedido ${numeroPedido}` });
  await expect(comprobante).toContainText("Documento no válido como factura");
  await expect(comprobante).toContainText(nombreCliente);
  await expect(comprobante).toContainText("Teléfono: 11 5555-0000");
  await expect(comprobante).toContainText("Domicilio: Quilmes");
  await expect(comprobante).toContainText("Entrega prometida: 15/01/2030");
  await expect(comprobante).toContainText("Observaciones: Color verde agua");

  const fila = comprobante.getByRole("row").filter({ hasText: producto.nombre });
  await expect(fila.getByRole("cell")).toHaveText([producto.nombre, "3", /1\.500,00/, /4\.500,00/]);
  await expect(comprobante.getByTestId("comprobante-total")).toHaveText(/4\.500,00/);

  await expect(comprobante).not.toContainText(/costo|ganancia|margen/i);
  await expect(comprobante).not.toContainText("1.200,00");
  await expect(comprobante).not.toContainText("PRUEBA-nota-interna-no-imprimir");
  await expect(page).toHaveTitle(`Comprobante ${numeroPedido} · MyM`);

  // Al imprimir queda solo la hoja: sin menu, encabezado ni botones.
  await page.emulateMedia({ media: "print" });
  await expect(comprobante).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Menu principal" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Volver al pedido" })).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("link", { name: "Volver al pedido" }).click();
  await expect(page.getByRole("region", { name: `Pedido ${numeroPedido}` })).toBeVisible();
});

test("comprobante: el boton Imprimir abre el dialogo de impresion", async ({ page }) => {
  const { idPedido } = await prepararPedido();
  await page.addInitScript(() => {
    window.print = () => {
      document.body.dataset.impreso = "si";
    };
  });

  await page.goto(`/pedidos/comprobante?pedido=${idPedido}`);
  await page.getByRole("button", { name: "Imprimir" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-impreso", "si");
});

test("comprobante: sin pedido en la direccion avisa y no rompe", async ({ page }) => {
  await page.goto("/pedidos/comprobante");
  await expect(page.getByText("Falta el pedido: abri el comprobante desde el detalle de un pedido.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeDisabled();
});
