import { api, crearCliente } from "./api";
import { expect, test, unico } from "./fixtures";

test("alta de una solicitud especial y cambio de estado", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteSol");
  await crearCliente(cliente);
  const solicitante = unico("PRUEBA-Solicitante");

  await page.goto("/solicitudes-especiales");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();

  const modal = page.getByRole("dialog", { name: "Nueva solicitud especial" });
  await modal.getByLabel("Cliente asociado", { exact: true }).selectOption({ label: cliente });
  await modal.getByLabel("Nombre solicitante").fill(solicitante);
  await modal.getByLabel("Descripcion").fill("Figura a medida de 20 cm");
  await modal.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(modal).toBeHidden();

  const fila = page.getByRole("row").filter({ hasText: solicitante });
  await expect(fila).toContainText("PENDIENTE");
  await expect(fila).toContainText(cliente);

  await fila.getByRole("button", { name: "Estado" }).click();
  const estado = page.getByRole("dialog", { name: "Cambiar estado" });
  await estado.getByLabel("Estado").selectOption("APROBADA");
  await estado.getByRole("button", { name: "Guardar estado" }).click();
  await expect(fila).toContainText("APROBADA");
});

test("convertir una solicitud en pedido: crea el pedido, la vincula y lleva al pedido", async ({ page }) => {
  const nombreCliente = unico("PRUEBA-ClienteConv");
  const cliente = await crearCliente(nombreCliente);
  const solicitante = unico("PRUEBA-SolConv");
  await api("POST", "/api/solicitudes-especiales", {
    idCliente: cliente.idCliente,
    nombreSolicitante: solicitante,
    descripcion: "Llavero a medida con el logo"
  });
  const sinCliente = unico("PRUEBA-SolSinCliente");
  await api("POST", "/api/solicitudes-especiales", { nombreSolicitante: sinCliente, descripcion: "Consulta" });

  await page.goto("/solicitudes-especiales");
  // Sin cliente no se puede convertir: el pedido necesita uno.
  await expect(
    page.getByRole("row").filter({ hasText: sinCliente }).getByRole("button", { name: "Convertir en pedido" })
  ).toHaveCount(0);

  const fila = page.getByRole("row").filter({ hasText: solicitante });
  await fila.getByRole("button", { name: "Convertir en pedido" }).click();
  const modal = page.getByRole("dialog", { name: "Convertir en pedido" });
  await expect(modal).toContainText(nombreCliente);
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();

  const aviso = page.getByRole("status").filter({ hasText: "Se creo el pedido" });
  await expect(aviso).toContainText(/PED-\d+/);
  const numero = ((await aviso.textContent()) ?? "").match(/PED-\d+/)![0];
  await expect(fila).toContainText("CONVERTIDA_A_PEDIDO");
  await expect(fila.getByRole("link", { name: numero })).toBeVisible();
  // Ya convertida: ni estado ni otra conversion.
  await expect(fila.getByRole("button", { name: "Estado" })).toHaveCount(0);
  await expect(fila.getByRole("button", { name: "Convertir en pedido" })).toHaveCount(0);

  await aviso.getByRole("link", { name: "Ir al pedido" }).click();
  await expect(page).toHaveURL(/\/pedidos\?pedido=\d+$/);
  const pedido = page.getByRole("region", { name: `Pedido ${numero}` });
  await expect(pedido).toBeVisible();
  await expect(pedido.getByTestId("estado-pedido")).toHaveText("Pendiente");
  await expect(pedido).toContainText("Pedido sin items");
});
