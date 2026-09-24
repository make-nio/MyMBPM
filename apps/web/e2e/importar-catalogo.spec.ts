import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { revisarAccesibilidad } from "./accesibilidad";
import { api } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

function archivoCsv(lineas: string[]) {
  return { name: "catalogo.csv", mimeType: "text/csv", buffer: Buffer.from(`﻿${lineas.join("\r\n")}\r\n`, "utf8") };
}

async function abrirImportacion(page: Page) {
  await page.goto("/items-catalogo");
  await page.getByRole("button", { name: "Importar CSV" }).click();
  return page.getByRole("dialog", { name: "Importar catalogo" });
}

test("importar el catalogo desde CSV: plantilla, vista previa con errores y todo o nada", async ({ page }) => {
  const lote = unico("PRUEBA-Imp");
  const categoriaNueva = `${lote}-Categoria`;
  const encabezado = "Nombre;Tipo;Categoria;Codigo;Precio;Costo;Stock minimo;Material;Color;Descripcion corta;Activo";

  const modal = await abrirImportacion(page);

  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    modal.getByRole("button", { name: "Descargar plantilla" }).click()
  ]);
  expect(descarga.suggestedFilename()).toMatch(/^plantilla-catalogo-\d{4}-\d{2}-\d{2}\.csv$|^plantilla-catalogo\.csv$/);
  expect((await readFile(await descarga.path(), "utf8")).split("\r\n")[0]).toBe(`﻿${encabezado}`);

  // Un archivo con una fila mal: no se puede importar nada.
  await modal.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([
      encabezado,
      `${lote}-Maceta;Producto;${categoriaNueva};${lote}-M1;"1.500,50";400;3;PLA;Blanco;;Si`,
      `${lote}-Filamento;Insumo;${categoriaNueva};;;"18000";2;PLA;Negro;;Si`,
      `${lote}-Mala;Otro;${categoriaNueva};;caro;;;;;;`
    ])
  );
  const vista = modal.getByRole("region", { name: "Vista previa" });
  await expect(vista.getByTestId("importacion-resumen")).toHaveText("3 filas: 2 para importar, 1 con errores.");
  await expect(vista).toContainText(`Categorias nuevas: ${categoriaNueva}.`);
  const filaMala = vista.getByRole("row").filter({ hasText: `${lote}-Mala` });
  await expect(filaMala).toContainText("4");
  await expect(filaMala).toContainText('Tipo: "Otro" no es Producto ni Insumo');
  await expect(filaMala).toContainText('Precio: "caro" no es un numero valido');
  await expect(modal.getByRole("button", { name: /^Importar \d+ items$/ })).toBeDisabled();
  await revisarAccesibilidad(page, "importacion de catalogo con errores");

  // Corregido: se importa todo junto.
  await modal.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([
      encabezado,
      `${lote}-Maceta;Producto;${categoriaNueva};${lote}-M1;"1.500,50";400;3;PLA;Blanco;;Si`,
      `${lote}-Filamento;Insumo;${categoriaNueva};;;"18000";2;PLA;Negro;;Si`
    ])
  );
  await expect(vista.getByTestId("importacion-resumen")).toHaveText("2 filas: 2 para importar.");
  await modal.getByRole("button", { name: "Importar 2 items" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText(`Se importaron 2 items y se crearon las categorias ${categoriaNueva}.`)).toBeVisible();

  const items = await api<Array<{ nombre: string; precio: string; costo: string; stockMinimo: number; categoria: { nombre: string } }>>(
    "GET",
    `/api/items-catalogo?busqueda=${encodeURIComponent(lote)}&limit=10`
  );
  const maceta = items.find((item) => item.nombre === `${lote}-Maceta`);
  expect(items).toHaveLength(2);
  expect(maceta).toMatchObject({ precio: "1500.5", costo: "400", stockMinimo: 3, categoria: { nombre: categoriaNueva } });

  // Reimportar el mismo archivo: los nombres ya existen, no se duplica nada.
  const otra = await abrirImportacion(page);
  await otra.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([encabezado, `${lote}-Maceta;Producto;${categoriaNueva};;;;;;;;`])
  );
  await expect(otra.getByRole("region", { name: "Vista previa" })).toContainText(
    "Nombre: ya existe un item con ese nombre en el catalogo"
  );
});

test("un archivo sin las columnas obligatorias se rechaza antes de enviarlo", async ({ page }) => {
  const modal = await abrirImportacion(page);
  await modal.getByLabel("Archivo CSV").setInputFiles(archivoCsv(["Nombre;Precio", "Algo;10"]));

  await expect(modal.getByText("Al archivo le faltan columnas obligatorias: Tipo, Categoria. Usa la plantilla.")).toBeVisible();
  await expect(modal.getByRole("region", { name: "Vista previa" })).toHaveCount(0);
});

test("un operador no ve la importacion ni la puede usar desde la API", async ({ browser }) => {
  const usuario = unico("prueba-operador-importacion").toLowerCase();
  await api("POST", "/api/usuarios", {
    nombre: "Operador",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: "clave-operador-1"
  });
  const login = await fetch(`${URL_WEB}/api/autenticacion/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identificador: usuario, password: "clave-operador-1" })
  });
  const token = ((await login.json()) as { data: { token: string } }).data.token;

  const respuesta = await fetch(`${URL_WEB}/api/items-catalogo/importacion/previsualizar`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ filas: [{ nombre: "X", tipo: "Producto", categoria: "Y" }] })
  });
  expect(respuesta.status).toBe(403);

  const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await page.goto("/ingresar");
  await page.getByLabel("Usuario o email").fill(usuario);
  await page.getByLabel("Clave").fill("clave-operador-1");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/items-catalogo");
  await expect(page.getByRole("heading", { name: "Items catalogo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Importar CSV" })).toHaveCount(0);
  await page.close();
});
