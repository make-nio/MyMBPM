import { revisarAccesibilidad } from "./accesibilidad";
import { api, crearCliente, crearProductoConStock } from "./api";
import { ADMIN_E2E } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Pagos de un pedido (#90): se registran con su medio, no superan el saldo, se anulan con motivo
// (administradores) y calculan el estado de cobro. Se ven en el comprobante y en Reportes.

async function pedidoDe(total: number) {
  const nombreCliente = unico("PRUEBA-ClientePagos");
  const cliente = await crearCliente(nombreCliente);
  const producto = await crearProductoConStock(unico("PRUEBA-ProdPagos"), total, 10);
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "MANUAL"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad: 1 });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  return { nombreCliente, pedido };
}

test("registrar una seña, completar el saldo, anular y verlo en el comprobante", async ({ page }) => {
  const { nombreCliente, pedido } = await pedidoDe(1000);

  await page.goto("/pedidos");
  await page.getByRole("row").filter({ hasText: pedido.numeroPedido }).getByRole("button", { name: /Ver/ }).click();
  const panel = page.getByRole("region", { name: `Pedido ${pedido.numeroPedido}` });
  const pagos = panel.getByRole("region", { name: "Pagos del pedido" });
  await expect(pagos.getByTestId("pedido-saldo")).toHaveText(/1\.000,00/);
  await expect(pagos).toContainText("Todavia no se registraron pagos.");

  // Una seña de 300 por transferencia: queda Señado.
  await pagos.getByRole("button", { name: "Registrar pago" }).click();
  const modal = page.getByRole("dialog", { name: "Registrar pago" });
  await expect(modal.getByLabel("Monto")).toHaveValue("1000");
  await revisarAccesibilidad(page, "registrar pago");
  await modal.getByLabel("Monto").fill("300");
  await modal.getByLabel("Medio de pago").selectOption("TRANSFERENCIA");
  await modal.getByRole("button", { name: "Registrar pago" }).click();
  await expect(modal).toBeHidden();
  await expect(panel.getByTestId("estado-cobro")).toHaveText("Señado");
  await expect(pagos.getByTestId("pedido-cobrado")).toHaveText(/300,00/);
  await expect(pagos.getByTestId("pedido-saldo")).toHaveText(/700,00/);
  await expect(pagos.getByRole("row").filter({ hasText: "Transferencia" })).toContainText(
    `${ADMIN_E2E.nombre} ${ADMIN_E2E.apellido}`
  );

  // Mas que el saldo no se puede.
  await pagos.getByRole("button", { name: "Registrar pago" }).click();
  await modal.getByLabel("Monto").fill("800");
  await modal.getByRole("button", { name: "Registrar pago" }).click();
  await expect(modal.getByRole("alert")).toContainText("supera el saldo");
  await modal.getByLabel("Monto").fill("700");
  await modal.getByRole("button", { name: "Registrar pago" }).click();
  await expect(modal).toBeHidden();
  await expect(panel.getByTestId("estado-cobro")).toHaveText("Pagado");
  await expect(pagos.getByRole("button", { name: "Registrar pago" })).toHaveCount(0);

  // Anular la seña (administrador): vuelve a Señado y queda la historia con el motivo.
  await pagos.getByRole("button", { name: /^Anular pago de \$\s?300,00/ }).click();
  const anular = page.getByRole("dialog", { name: "Anular pago" });
  await anular.getByLabel("Motivo").fill("PRUEBA se cargo dos veces");
  await anular.getByRole("button", { name: "Anular pago" }).click();
  await expect(anular).toBeHidden();
  await expect(panel.getByTestId("estado-cobro")).toHaveText("Señado");
  await expect(pagos.getByRole("row").filter({ hasText: "Transferencia" })).toContainText("Anulado: PRUEBA se cargo dos veces");

  // El comprobante muestra lo cobrado y el saldo.
  await page.goto(`/pedidos/comprobante?pedido=${pedido.idPedido}`);
  const comprobante = page.getByRole("article", { name: `Comprobante del pedido ${pedido.numeroPedido}` });
  await expect(comprobante.getByTestId("comprobante-cobrado")).toHaveText(/700,00/);
  await expect(comprobante.getByTestId("comprobante-saldo")).toHaveText(/300,00/);
  await expect(comprobante).toContainText(nombreCliente);
});

test("la API: el cobro no se elige a mano, un pago ajeno no se anula y un operador no anula", async () => {
  const { pedido } = await pedidoDe(500);
  const otro = await pedidoDe(500);

  // estadoCobro en el cambio de estado se ignora: lo calculan los pagos.
  await api("PATCH", `/api/pedidos/${pedido.idPedido}/estado`, { estadoPedido: "EN_PREPARACION", estadoCobro: "PAGADO" });
  expect((await api<{ estadoCobro: string }>("GET", `/api/pedidos/${pedido.idPedido}`)).estadoCobro).toBe("PENDIENTE");

  const hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const conPago = await api<{ pagos: Array<{ idPago: string }> }>("POST", `/api/pedidos/${pedido.idPedido}/pagos`, {
    fecha: hoy,
    monto: 100,
    medioPago: "EFECTIVO"
  });
  const idPago = conPago.pagos[0].idPago;

  // Desde otro pedido, ese pago no existe.
  await expect(api("POST", `/api/pedidos/${otro.pedido.idPedido}/pagos/${idPago}/anular`, { motivo: "x" })).rejects.toThrow(/404/);
  // Sin motivo, no.
  await expect(api("POST", `/api/pedidos/${pedido.idPedido}/pagos/${idPago}/anular`, { motivo: " " })).rejects.toThrow(/400/);
  // Un pedido cancelado no recibe pagos.
  await api("PATCH", `/api/pedidos/${otro.pedido.idPedido}/estado`, { estadoPedido: "CANCELADO", devolverStock: false }).catch(() =>
    api("PATCH", `/api/pedidos/${otro.pedido.idPedido}/estado`, { estadoPedido: "CANCELADO" })
  );
  await expect(
    api("POST", `/api/pedidos/${otro.pedido.idPedido}/pagos`, { fecha: hoy, monto: 1, medioPago: "EFECTIVO" })
  ).rejects.toThrow(/409/);
});

test("Reportes muestra lo cobrado en el mes por medio de pago", async ({ page }) => {
  const { pedido } = await pedidoDe(2000);
  const hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  await api("POST", `/api/pedidos/${pedido.idPedido}/pagos`, { fecha: hoy, monto: 1234, medioPago: "MERCADO_PAGO" });

  await page.goto("/reportes");
  const cobros = page.getByRole("region", { name: "Cobrado por medio de pago" });
  await expect(cobros.getByRole("row").filter({ hasText: "Mercado pago" })).toBeVisible();
  await expect(cobros.getByTestId("reporte-cobrado")).not.toHaveText("");
});
