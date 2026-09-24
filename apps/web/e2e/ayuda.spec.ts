import { expect, test } from "./fixtures";

test("la ayuda se abre desde el menu y explica los pasos y los estados", async ({ page }) => {
  await page.goto("/panel");
  await page.getByRole("link", { name: "Ayuda" }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByRole("heading", { name: "Como se usa" })).toBeVisible();

  for (const guia of ["Cargar un pedido", "Confirmar un pedido", "Producir", "Ajustar el stock", "Costos y ganancia (administradores)"]) {
    await expect(page.getByRole("region", { name: guia }).getByRole("listitem").first()).toBeVisible();
  }

  const estados = page.getByRole("region", { name: "Que significa cada estado" });
  await expect(estados.getByRole("definition").filter({ hasText: "Ya se desconto el stock" })).toBeVisible();
  // Los avisos importantes: cancelar no devuelve el stock.
  await expect(page.getByRole("region", { name: "Confirmar un pedido" })).toContainText("no devuelve el stock");
  await expect(page.getByRole("region", { name: "Producir" })).toContainText("no vuelven al stock");
});
