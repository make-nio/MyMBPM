import { revisarAccesibilidad } from "./accesibilidad";
import { api, crearCliente, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Devolucion de un pedido entregado (#96): el cliente devuelve todo o una parte; si vuelve al
// stock y si se reintegra la plata lo decide la configuracion (o quien la registra, si pregunta).
// La configuracion es global: cada prueba la fija y al terminar vuelve a preguntar.
const PREGUNTAR = { devolucionStock: "PREGUNTAR", devolucionReintegro: "PREGUNTAR" };

test.afterEach(async () => {
  await api("PATCH", "/api/configuracion", PREGUNTAR);
});

async function stockActual(idItemCatalogo: string) {
  const stock = await api<{ stockActual: string }>(
    "GET",
    `/api/stock/actual?idItemCatalogo=${idItemCatalogo}&tipoStock=PRODUCTO`
  );
  return Number(stock.stockActual);
}

// Pedido entregado de 3 velas a 100 y 1 maceta a 700 (total 1000), cobrado entero.
async function pedidoEntregado() {
  const cliente = await crearCliente(unico("PRUEBA-ClienteDevol"));
  const vela = await crearProductoConStock(unico("PRUEBA-VelaDevol"), 100, 10);
  const maceta = await crearProductoConStock(unico("PRUEBA-MacetaDevol"), 700, 10);
  const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente: cliente.idCliente,
    origenPedido: "MANUAL"
  });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: vela.idItemCatalogo, cantidad: 3 });
  await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: maceta.idItemCatalogo, cantidad: 1 });
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);
  const hoy = new Date().toISOString().slice(0, 10);
  await api("POST", `/api/pedidos/${pedido.idPedido}/pagos`, { fecha: hoy, monto: 1000, medioPago: "EFECTIVO" });
  await api("PATCH", `/api/pedidos/${pedido.idPedido}/estado`, { estadoPedido: "ENTREGADO" });
  const detalle = await api<{ detalles: Array<{ idPedidoDetalle: string; idItemCatalogo: string }> }>(
    "GET",
    `/api/pedidos/${pedido.idPedido}`
  );
  const lineaDe = (idItem: string) => detalle.detalles.find((linea) => linea.idItemCatalogo === idItem)!.idPedidoDetalle;
  return { pedido, vela: { ...vela, linea: lineaDe(vela.idItemCatalogo) }, maceta: { ...maceta, linea: lineaDe(maceta.idItemCatalogo) } };
}

test("registrar una devolucion parcial: vuelve al stock, se reintegra y baja lo que falta cobrar", async ({ page }) => {
  await api("PATCH", "/api/configuracion", PREGUNTAR);
  const { pedido, vela } = await pedidoEntregado();
  expect(await stockActual(vela.idItemCatalogo)).toBe(7);

  await page.goto(`/pedidos?pedido=${pedido.idPedido}`);
  const panel = page.getByRole("region", { name: `Pedido ${pedido.numeroPedido}` });
  const devoluciones = panel.getByRole("region", { name: "Devoluciones del pedido" });
  await expect(devoluciones).toContainText("No hubo devoluciones.");

  await devoluciones.getByRole("button", { name: "Registrar devolucion" }).click();
  const modal = page.getByRole("dialog", { name: "Registrar devolucion" });
  await modal.getByLabel(new RegExp(`^${vela.nombre}: cuanto vuelve \\(hasta 3`)).fill("2");
  await expect(modal.getByTestId("devolucion-valor")).toHaveText(/200,00/);
  await modal.getByLabel("Motivo").fill("Llegaron rotas");
  // Pregunta las dos cosas, con "si" marcado; el monto arranca en lo devuelto.
  await expect(modal.getByLabel("Si, vuelve al stock")).toBeChecked();
  await expect(modal.getByLabel("Si, reintegrar")).toBeChecked();
  await expect(modal.getByLabel(/^Monto a reintegrar/)).toHaveValue("200");
  await modal.getByLabel("Medio del reintegro").selectOption("TRANSFERENCIA");
  await revisarAccesibilidad(page, "registrar devolucion");
  await modal.getByRole("button", { name: "Registrar devolucion" }).click();
  await expect(modal).toBeHidden();

  const fila = devoluciones.getByRole("row").filter({ hasText: "Llegaron rotas" });
  await expect(fila).toContainText(`2 x ${vela.nombre}`);
  await expect(fila).toContainText("Volvio al stock");
  await expect(fila).toContainText(/200,00 \(Transferencia\)/);
  expect(await stockActual(vela.idItemCatalogo)).toBe(9);

  // En pagos: lo devuelto, el reintegro en negativo y el saldo en cero (sigue Pagado).
  const pagos = panel.getByRole("region", { name: "Pagos del pedido" });
  await expect(pagos.getByTestId("pedido-devuelto")).toHaveText(/200,00/);
  await expect(pagos.getByTestId("pedido-cobrado")).toHaveText(/800,00/);
  await expect(pagos.getByTestId("pedido-saldo")).toHaveText(/0,00/);
  await expect(pagos.getByRole("row").filter({ hasText: "Reintegro" })).toContainText(/-\s?\$\s?200,00|\$\s?-200,00/);
  await expect(pagos.getByRole("row").filter({ hasText: "Reintegro" }).getByRole("button", { name: /Anular/ })).toHaveCount(0);
  await expect(panel.getByTestId("estado-cobro")).toHaveText("Pagado");

  // De la vela queda 1 por devolver.
  await devoluciones.getByRole("button", { name: "Registrar devolucion" }).click();
  await expect(modal.getByLabel(new RegExp(`^${vela.nombre}: cuanto vuelve \\(hasta 1\\)`))).toBeVisible();
});

test("con la configuracion en automatico no pregunta, y la API cuida lo que se puede devolver", async ({ page }) => {
  await api("PATCH", "/api/configuracion", { devolucionStock: "NO_DEVOLVER", devolucionReintegro: "NO_DEVOLVER" });
  const { pedido, vela, maceta } = await pedidoEntregado();

  await page.goto(`/pedidos?pedido=${pedido.idPedido}`);
  const devoluciones = page.getByRole("region", { name: "Devoluciones del pedido" });
  await devoluciones.getByRole("button", { name: "Registrar devolucion" }).click();
  const modal = page.getByRole("dialog", { name: "Registrar devolucion" });
  await expect(modal.getByTestId("devolucion-stock-automatico")).toHaveText(/no vuelve al stock/);
  await expect(modal.getByTestId("devolucion-reintegro-automatico")).toHaveText(/no se reintegra/);
  await expect(modal.getByRole("radio")).toHaveCount(0);
  await modal.getByLabel(new RegExp(`^${maceta.nombre}: cuanto vuelve`)).fill("1");
  await modal.getByLabel("Motivo").fill("No le gusto");
  await modal.getByRole("button", { name: "Registrar devolucion" }).click();
  await expect(modal).toBeHidden();
  await expect(devoluciones.getByRole("row").filter({ hasText: "No le gusto" })).toContainText("No volvio");
  // Sin reintegro: lo cobrado sigue entero y no vuelve nada al stock.
  expect(await stockActual(maceta.idItemCatalogo)).toBe(9);
  const resumen = await api<{ cobrado: string; devuelto: string; saldo: string }>("GET", `/api/pedidos/${pedido.idPedido}/pagos`);
  expect(Number(resumen.cobrado)).toBe(1000);
  expect(Number(resumen.devuelto)).toBe(700);
  expect(Number(resumen.saldo)).toBe(-700);

  // Mas de lo que queda por devolver: 409.
  await expect(
    api("POST", `/api/pedidos/${pedido.idPedido}/devoluciones`, {
      lineas: [{ idPedidoDetalle: maceta.linea, cantidad: 1 }],
      motivo: "otra vez"
    })
  ).rejects.toThrow(/409/);

  // En automatico, lo que pida quien la registra no cuenta: vuelve igual al stock si dice DEVOLVER.
  await api("PATCH", "/api/configuracion", { devolucionStock: "DEVOLVER", devolucionReintegro: "NO_DEVOLVER" });
  await api("POST", `/api/pedidos/${pedido.idPedido}/devoluciones`, {
    lineas: [{ idPedidoDetalle: vela.linea, cantidad: 1 }],
    motivo: "Una fallada",
    devolverStock: false
  });
  expect(await stockActual(vela.idItemCatalogo)).toBe(8);
});

test("un pedido sin entregar no acepta devoluciones", async () => {
  const cliente = await crearCliente(unico("PRUEBA-ClienteDevolNo"));
  const vela = await crearProductoConStock(unico("PRUEBA-VelaDevolNo"), 100, 10);
  const pedido = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  const conLinea = await api<{ detalles: Array<{ idPedidoDetalle: string }> }>(
    "POST",
    `/api/pedidos/${pedido.idPedido}/detalles`,
    { idItemCatalogo: vela.idItemCatalogo, cantidad: 1 }
  );
  await api("POST", `/api/pedidos/${pedido.idPedido}/confirmar`);

  await expect(
    api("POST", `/api/pedidos/${pedido.idPedido}/devoluciones`, {
      lineas: [{ idPedidoDetalle: conLinea.detalles[0].idPedidoDetalle, cantidad: 1 }],
      motivo: "x",
      devolverStock: true,
      reintegrar: false
    })
  ).rejects.toThrow(/409/);
});
