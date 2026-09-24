import { revisarAccesibilidad } from "./accesibilidad";
import { crearCliente, crearProductoConReceta, crearProductoConStock } from "./api";
import { expect, test, unico } from "./fixtures";

// Revision automatica (axe) de las pantallas principales, sus modales de alta y sus detalles.
// axe tarda en paginas largas (la base E2E local acumula datos entre corridas): margen amplio.
test.describe.configure({ timeout: 120_000 });

const pantallas: Array<{ ruta: string; titulo: string; alta?: string }> = [
  { ruta: "/panel", titulo: "Panel" },
  { ruta: "/categorias", titulo: "Categorias", alta: "Nueva categoria" },
  { ruta: "/clientes", titulo: "Clientes", alta: "Nuevo cliente" },
  { ruta: "/items-catalogo", titulo: "Items catalogo", alta: "Nuevo item" },
  { ruta: "/solicitudes-especiales", titulo: "Solicitudes", alta: "Nueva solicitud" },
  { ruta: "/usuarios", titulo: "Usuarios", alta: "Nuevo usuario" },
  { ruta: "/pedidos", titulo: "Pedidos", alta: "Nuevo pedido" },
  { ruta: "/produccion", titulo: "Produccion", alta: "Nueva orden" },
  { ruta: "/stock", titulo: "Stock" },
  { ruta: "/reportes", titulo: "Reportes" },
  { ruta: "/ayuda", titulo: "Ayuda" }
];

test("busqueda global con resultados", async ({ page }) => {
  await crearCliente(unico("PRUEBA-ClienteBuscarA11y"));
  await page.goto("/panel");
  await page.getByRole("button", { name: /^Buscar Ctrl K$/ }).click();
  await page.getByLabel("Buscar pedidos, clientes e items").fill("PRUEBA-ClienteBuscarA11y");
  await expect(page.getByRole("region", { name: "Clientes" })).toBeVisible();
  await revisarAccesibilidad(page, "busqueda global");
});

test.describe("sin sesion", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ingreso", async ({ page }) => {
    await page.goto("/ingresar");
    await expect(page.getByLabel("Usuario o email")).toBeVisible();
    await revisarAccesibilidad(page, "/ingresar");
  });
});

for (const pantalla of pantallas) {
  test(`${pantalla.ruta}${pantalla.alta ? " y su alta" : ""}`, async ({ page }) => {
    await page.goto(pantalla.ruta);
    await expect(page.getByText(/^Cargando/)).toHaveCount(0);
    await revisarAccesibilidad(page, pantalla.ruta);

    if (pantalla.alta) {
      await page.getByRole("button", { name: pantalla.alta }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await revisarAccesibilidad(page, `${pantalla.ruta} (modal ${pantalla.alta})`);
    }
  });
}

test("detalles: pedido, orden de produccion, stock y receta", async ({ page }) => {
  const cliente = unico("PRUEBA-ClienteA11y");
  await crearCliente(cliente);
  const producto = await crearProductoConStock(unico("PRUEBA-ProdA11y"), 100, 5);
  const receta = await crearProductoConReceta({
    producto: unico("PRUEBA-RecA11y"),
    insumo: unico("PRUEBA-InsA11y"),
    cantidadRequerida: 1,
    stockInsumo: 5
  });

  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Nuevo pedido" }).click();
  const alta = page.getByRole("dialog", { name: "Nuevo pedido" });
  await alta.getByLabel("Buscar cliente").fill(cliente);
  await alta.getByLabel("Cliente", { exact: true }).selectOption({ label: cliente });
  await alta.getByRole("button", { name: "Crear pedido" }).click();
  await expect(page.getByRole("region", { name: /^Pedido PED-/ })).toBeVisible();
  await revisarAccesibilidad(page, "detalle de pedido");

  await page.goto("/produccion");
  await page.getByRole("button", { name: "Nueva orden" }).click();
  await page.getByRole("button", { name: "Crear orden" }).click();
  await expect(page.getByRole("heading", { name: /^Orden #/ })).toBeVisible();
  await revisarAccesibilidad(page, "detalle de orden de produccion");

  await page.goto("/stock");
  await page.getByLabel("Buscar item").fill(producto.nombre);
  await page.getByRole("row").filter({ hasText: producto.nombre }).getByRole("button", { name: "Movimientos" }).click();
  await expect(page.getByRole("region", { name: `Stock de ${producto.nombre}` })).toBeVisible();
  await revisarAccesibilidad(page, "detalle de stock");

  await page.goto("/items-catalogo");
  await page.getByLabel("Buscar item").fill(receta.producto.nombre);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  // Por la celda exacta: la fila del insumo tambien contiene el nombre del producto (va en su
  // categoria) y, hasta que se aplica la busqueda, puede estar en la lista.
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: receta.producto.nombre, exact: true }) })
    .getByRole("button", { name: "Receta" })
    .click();
  await expect(page.getByRole("heading", { name: `Receta de ${receta.producto.nombre}` })).toBeVisible();
  await revisarAccesibilidad(page, "receta de un item");
});
