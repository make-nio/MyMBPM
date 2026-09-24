import type { Page } from "@playwright/test";

import { api, crearCliente } from "./api";
import { expect, test, unico } from "./fixtures";

// Dia de Argentina (AAAA-MM-DD) a `dias` de hoy, como lo espera <input type="date"> y la API.
function diaDesdeHoy(dias: number) {
  const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
}

// "2026-09-30" -> "30/09/2026", como se muestra en pantalla.
function comoSeMuestra(dia: string) {
  return dia.split("-").reverse().join("/");
}

async function crearPedido(cliente: string, fechaEntrega?: string) {
  const { idCliente } = await crearCliente(cliente);
  return api<{ idPedido: string; numeroPedido: string }>("POST", "/api/pedidos", {
    idCliente,
    origenPedido: "WHATSAPP",
    fechaEntrega
  });
}

function abrirPedido(page: Page, idPedido: string, numeroPedido: string) {
  return page.goto(`/pedidos?pedido=${idPedido}`).then(() => page.getByRole("region", { name: `Pedido ${numeroPedido}` }));
}

test("la fecha de entrega prometida se carga al crear el pedido y se cambia o borra desde el detalle", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteEntrega");
  await crearCliente(cliente);
  const prometida = diaDesdeHoy(10);

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo pedido" });
  await modal.getByLabel("Cliente", { exact: true }).selectOption({ label: cliente });
  await modal.getByLabel("Entrega prometida (opcional)").fill(prometida);
  await modal.getByRole("button", { name: "Crear pedido" }).click();
  await expect(modal).toBeHidden();

  const panel = page.getByRole("region", { name: /^Pedido PED-/ });
  await expect(panel.getByTestId("entrega-prometida")).toHaveText(comoSeMuestra(prometida));
  await expect(panel.getByTestId("pedido-atrasado")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: cliente })).toContainText(comoSeMuestra(prometida));

  const nueva = diaDesdeHoy(3);
  const campo = panel.getByLabel("Entrega prometida");
  await expect(campo).toHaveValue(prometida);
  await campo.fill(nueva);
  await panel.getByRole("button", { name: "Guardar fecha" }).click();
  await expect(panel.getByTestId("entrega-prometida")).toHaveText(comoSeMuestra(nueva));
  await expect(panel.getByRole("button", { name: "Guardar fecha" })).toBeDisabled();

  await campo.fill("");
  await panel.getByRole("button", { name: "Guardar fecha" }).click();
  await expect(panel.getByTestId("entrega-prometida")).toHaveText("sin fecha");
});

test("un pedido con la fecha vencida se marca atrasado y, entregado o cancelado, ya no cambia la fecha", async ({ page }) => {
  const pedido = await crearPedido(unico("PRUEBA-ClienteAtrasado"), diaDesdeHoy(-2));

  const panel = await abrirPedido(page, pedido.idPedido, pedido.numeroPedido);
  await expect(panel.getByTestId("pedido-atrasado")).toBeVisible();

  await api("PATCH", `/api/pedidos/${pedido.idPedido}/estado`, { estadoPedido: "CANCELADO" });
  await page.reload();
  await expect(panel.getByTestId("estado-pedido")).toHaveText("Cancelado");
  await expect(panel.getByTestId("pedido-atrasado")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Guardar fecha" })).toHaveCount(0);
});

test("el panel muestra las entregas atrasadas y las de esta semana", async ({ page }) => {
  const atrasado = await crearPedido(unico("PRUEBA-ClientePanelAtr"), diaDesdeHoy(-1));
  const estaSemana = await crearPedido(unico("PRUEBA-ClientePanelSem"), diaDesdeHoy(6));
  const masAdelante = await crearPedido(unico("PRUEBA-ClientePanelDesp"), diaDesdeHoy(8));
  const pedidos = [atrasado, estaSemana, masAdelante];

  try {
    await page.goto("/panel");
    const atrasados = page.getByRole("region", { name: "Entregas atrasadas" });
    const semana = page.getByRole("region", { name: "Entregas de esta semana" });

    // Las listas muestran 5: la base local de E2E puede tener otros pedidos con fecha.
    await expect(atrasados).toBeVisible();
    await expect(semana).not.toContainText(atrasado.numeroPedido);
    await expect(atrasados).not.toContainText(estaSemana.numeroPedido);
    // A 8 dias todavia no entra en "esta semana".
    await expect(semana).not.toContainText(masAdelante.numeroPedido);
    await expect(atrasados).not.toContainText(masAdelante.numeroPedido);

    await expect(atrasados.getByRole("link", { name: atrasado.numeroPedido })).toBeVisible();
    await expect(semana.getByRole("link", { name: estaSemana.numeroPedido })).toBeVisible();

    await semana.getByRole("link", { name: estaSemana.numeroPedido }).click();
    await expect(page.getByRole("region", { name: `Pedido ${estaSemana.numeroPedido}` })).toBeVisible();
  } finally {
    // Cancelados dejan de contar: no se acumulan en el panel de otras corridas.
    for (const pedido of pedidos) {
      await api("PATCH", `/api/pedidos/${pedido.idPedido}/estado`, { estadoPedido: "CANCELADO" });
    }
  }
});
