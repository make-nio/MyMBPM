import { crearCliente } from "./api";
import { expect, test, unico } from "./fixtures";

test("alta de una solicitud especial y cambio de estado", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteSol");
  await crearCliente(cliente);
  const solicitante = unico("PRUEBA-Solicitante");

  await page.goto("/solicitudes-especiales");
  await page.getByRole("button", { name: "Nueva solicitud" }).click();

  const modal = page.getByRole("dialog", { name: "Nueva solicitud especial" });
  await modal.getByLabel("Cliente asociado").selectOption({ label: cliente });
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
