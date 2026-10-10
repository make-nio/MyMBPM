import { randomUUID } from "node:crypto";

import { api, ajustarStock, crearCategoria, crearItem } from "./api";
import { expect, test, unico } from "./fixtures";

// Remito no fiscal del pedido (#95). Pedido con costo cargado y las dos observaciones: el remito no puede mostrar ni el costo
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

test("remito: se abre desde el pedido, sin costos ni notas internas, con la leyenda y la firma", async ({ page }) => {
  const { idPedido, numeroPedido, producto, nombreCliente } = await prepararPedido();

  await page.goto(`/pedidos?pedido=${idPedido}`);
  const panel = page.getByRole("region", { name: `Pedido ${numeroPedido}` });
  // El detalle, para un administrador, si muestra el costo: el remito no.
  await expect(panel.getByTestId("costo-pedido")).toHaveText(/1\.200,00/);
  await panel.getByRole("link", { name: "Remito" }).click();

  await expect(page).toHaveURL(new RegExp(`/pedidos/comprobante/?\\?pedido=${idPedido}$`));
  const comprobante = page.getByRole("article", { name: `Remito del pedido ${numeroPedido}` });
  await expect(comprobante.getByRole("heading", { level: 1 })).toHaveText("Remito");
  await expect(comprobante).toContainText(`Remito N.º ${numeroPedido}`);
  await expect(comprobante).toContainText("Documento no válido como factura");
  await expect(comprobante).toContainText(nombreCliente);
  await expect(comprobante).toContainText("Teléfono: 11 5555-0000");
  await expect(comprobante).toContainText("Domicilio: Quilmes");
  await expect(comprobante).toContainText("Entrega prometida: 15/01/2030");
  await expect(comprobante).toContainText("Observaciones: Color verde agua");
  const firma = comprobante.getByRole("region", { name: "Recibí conforme" });
  await expect(firma).toContainText("Firma");
  await expect(firma).toContainText("Aclaración");
  await expect(firma).toContainText("DNI");
  await expect(firma).toContainText("Fecha de recepción");
  // Sin devoluciones no hay columna "Devuelto".
  await expect(comprobante.getByRole("columnheader", { name: "Devuelto" })).toHaveCount(0);

  const fila = comprobante.getByRole("row").filter({ hasText: producto.nombre });
  await expect(fila.getByRole("cell")).toHaveText([producto.nombre, "3", /1\.500,00/, /4\.500,00/]);
  await expect(comprobante.getByTestId("comprobante-total")).toHaveText(/4\.500,00/);

  await expect(comprobante).not.toContainText(/costo|ganancia|margen/i);
  await expect(comprobante).not.toContainText("1.200,00");
  await expect(comprobante).not.toContainText("PRUEBA-nota-interna-no-imprimir");
  await expect(page).toHaveTitle(`Remito ${numeroPedido} · MyM`);

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

test("remito: el boton Imprimir abre el dialogo de impresion", async ({ page }) => {
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

test("remito: sin pedido en la direccion avisa y no rompe", async ({ page }) => {
  await page.goto("/pedidos/comprobante");
  await expect(page.getByText("Falta el pedido: abri el remito desde el detalle de un pedido.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeDisabled();
});

test("remito: un pedido entregado muestra la fecha de entrega y lo devuelto", async ({ page }) => {
  const { idPedido, numeroPedido, producto } = await prepararPedido();
  // Sin fecha, la entrega real es hoy (dia de Argentina): no puede ser futura.
  await api("PATCH", `/api/pedidos/${idPedido}/estado`, { estadoPedido: "ENTREGADO" });
  const hoy = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date());
  const { detalles } = await api<{ detalles: Array<{ idPedidoDetalle: string }> }>("GET", `/api/pedidos/${idPedido}`);
  await api("POST", `/api/pedidos/${idPedido}/devoluciones`, {
    lineas: [{ idPedidoDetalle: detalles[0]!.idPedidoDetalle, cantidad: 1 }],
    motivo: "PRUEBA una fallada",
    claveIdempotencia: randomUUID(),
    devolverStock: false,
    reintegrar: false
  });

  await page.goto(`/pedidos/comprobante?pedido=${idPedido}`);
  const remito = page.getByRole("article", { name: `Remito del pedido ${numeroPedido}` });
  await expect(remito.getByTestId("remito-entregado")).toHaveText(`Entregado: ${hoy}`);
  await expect(remito).not.toContainText("Entrega prometida");
  const fila = remito.getByRole("row").filter({ hasText: producto.nombre });
  await expect(fila.getByRole("cell")).toHaveText([producto.nombre, "3", "1", /1\.500,00/, /4\.500,00/]);
  await expect(remito.getByTestId("remito-devuelto")).toHaveText(/1\.500,00/);
  await expect(remito.getByTestId("comprobante-total")).toHaveText(/4\.500,00/);
});
