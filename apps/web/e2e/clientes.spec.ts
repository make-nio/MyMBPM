import { revisarAccesibilidad } from "./accesibilidad";
import { api, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

test("alta, busqueda sin distinguir mayusculas, edicion y desactivacion de un cliente", async ({ page }) => {
  const nombre = unico("PRUEBA-Cliente");

  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();

  const modal = page.getByRole("dialog");
  await modal.getByLabel("Nombre").fill(nombre);
  await modal.getByLabel("Apellido").fill("Núñez");
  await modal.getByLabel("Telefono").fill("1122334455");
  await modal.getByLabel("Email").fill(`${nombre.toLowerCase()}@mymbpm.test`);
  await modal.getByRole("button", { name: /guardar/i }).click();
  await expect(modal).toBeHidden();

  await page.getByPlaceholder(/buscar por nombre/i).fill(nombre.toUpperCase());
  await page.getByRole("button", { name: "Buscar", exact: true }).click();

  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toHaveCount(1);

  await fila.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("dialog").getByLabel("Telefono").fill("5544332211");
  await page.getByRole("dialog").getByRole("button", { name: /guardar/i }).click();
  await expect(fila).toContainText("5544332211");

  await fila.getByRole("button", { name: "Desactivar" }).click();
  await expect(fila.getByRole("button", { name: "Activar" })).toBeVisible();
});

test("ficha del cliente: total comprado (solo confirmados, sin cancelados) e historial de pedidos", async ({ page }) => {
  const nombre = unico("PRUEBA-ClienteFicha");
  const cliente = await api<{ idCliente: string }>("POST", "/api/clientes", { nombre, telefono: "11 3333-0000", localidad: "Bernal" });
  const producto = await crearProductoConStock(unico("PRUEBA-ProdFicha"), 1000, 10);
  const nuevoPedido = async (cantidad: number) => {
    const pedido = await api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
      idCliente: cliente.idCliente,
      origenPedido: "WHATSAPP"
    });
    await api("POST", `/api/pedidos/${pedido.idPedido}/detalles`, { idItemCatalogo: producto.idItemCatalogo, cantidad });
    return pedido;
  };

  const confirmado = await nuevoPedido(2);
  await api("POST", `/api/pedidos/${confirmado.idPedido}/confirmar`);
  const cancelado = await nuevoPedido(1);
  await api("POST", `/api/pedidos/${cancelado.idPedido}/confirmar`);
  await api("PATCH", `/api/pedidos/${cancelado.idPedido}/estado`, { estadoPedido: "CANCELADO", devolverStock: false, motivoCancelacion: "PRUEBA cancelado" });
  const pendiente = await nuevoPedido(3);

  await page.goto("/clientes");
  await page.getByLabel("Buscar cliente").fill(nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("row").filter({ hasText: nombre }).getByRole("button", { name: "Ficha" }).click();

  const ficha = page.getByRole("region", { name: `Ficha de ${nombre}` });
  await expect(ficha).toContainText("11 3333-0000 · Bernal");
  await expect(ficha.getByTestId("total-comprado")).toHaveText(/2\.000,00/);
  await expect(ficha.getByTestId("pedidos-comprados")).toHaveText("1");

  // El historial muestra todos, con su estado y total.
  await expect(ficha.getByRole("row").filter({ hasText: confirmado.numeroPedido })).toContainText("Confirmado");
  await expect(ficha.getByRole("row").filter({ hasText: cancelado.numeroPedido })).toContainText("Cancelado");
  await expect(ficha.getByRole("row").filter({ hasText: pendiente.numeroPedido })).toContainText(/Pendiente.*3\.000,00/);
  await revisarAccesibilidad(page, "ficha del cliente");

  await ficha.getByRole("row").filter({ hasText: pendiente.numeroPedido }).getByRole("link", { name: "Ver pedido" }).click();
  await expect(page).toHaveURL(new RegExp(`/pedidos/?\\?pedido=${pendiente.idPedido}$`));
  await expect(page.getByRole("region", { name: `Pedido ${pendiente.numeroPedido}` })).toBeVisible();
});

// Tipo de cliente (#100): se elige en el alta, se ve en la ficha y filtra la lista.
test("un cliente Comercio: se ve en la lista y en la ficha, y el filtro por tipo lo encuentra", async ({ page }) => {
  const nombre = unico("PRUEBA-Comercio");

  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Nombre").fill(nombre);
  // Sin elegir, queda Consumidor.
  await expect(modal.getByLabel("Tipo de cliente")).toHaveValue("CONSUMIDOR");
  await modal.getByLabel("Tipo de cliente").selectOption("COMERCIO");
  await revisarAccesibilidad(page, "alta de cliente con tipo");
  await modal.getByRole("button", { name: /guardar/i }).click();
  await expect(modal).toBeHidden();

  await page.getByPlaceholder(/buscar por nombre/i).fill(nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const fila = page.getByRole("row").filter({ hasText: nombre });
  await expect(fila).toContainText("Comercio");

  // El filtro por tipo: con Revendedor no aparece, con Comercio si.
  await page.getByLabel("Filtrar por tipo de cliente").selectOption("REVENDEDOR");
  await expect(page.getByRole("row").filter({ hasText: nombre })).toHaveCount(0);
  await page.getByLabel("Filtrar por tipo de cliente").selectOption("COMERCIO");
  await expect(fila).toBeVisible();

  await fila.getByRole("button", { name: "Ficha" }).click();
  await expect(page.getByTestId("segmento-cliente")).toHaveText("Comercio");

  // Por la API: un tipo fuera de la lista da 400 y sin tipo queda Consumidor.
  await expect(api("POST", "/api/clientes", { nombre: unico("PRUEBA-Mayorista"), segmento: "MAYORISTA" })).rejects.toThrow(/400/);
  const comun = await api<{ segmento: string }>("POST", "/api/clientes", { nombre: unico("PRUEBA-Comun") });
  expect(comun.segmento).toBe("CONSUMIDOR");
});
