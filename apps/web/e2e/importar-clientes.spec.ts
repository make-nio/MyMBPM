import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { revisarAccesibilidad } from "./accesibilidad";
import { api } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

const ENCABEZADO = "Nombre;Apellido;Documento;Telefono;Email;Instagram;Domicilio;Localidad;Provincia;Observaciones;Activo";

function archivoCsv(lineas: string[]) {
  return { name: "clientes.csv", mimeType: "text/csv", buffer: Buffer.from(`﻿${lineas.join("\r\n")}\r\n`, "utf8") };
}

async function abrirImportacion(page: Page) {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Importar CSV" }).click();
  return page.getByRole("dialog", { name: "Importar clientes" });
}

test("importar clientes desde CSV: plantilla, repetidos, errores por fila y todo o nada", async ({ page }) => {
  const lote = unico("PRUEBA-ImpCli");
  // Documento unico por corrida (la base local de E2E conserva los datos entre corridas).
  const numero = String(Date.now()).slice(-8);
  const documento = `${numero.slice(0, 2)}.${numero.slice(2, 5)}.${numero.slice(5)}`;
  const existente = await api<{ idCliente: string }>("POST", "/api/clientes", {
    nombre: `${lote}-Existente`,
    email: `${lote.toLowerCase()}-ya@mymbpm.test`
  });
  expect(existente.idCliente).toBeTruthy();

  const modal = await abrirImportacion(page);
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    modal.getByRole("button", { name: "Descargar plantilla" }).click()
  ]);
  expect((await readFile(await descarga.path(), "utf8")).split("\r\n")[0]).toBe(`﻿${ENCABEZADO}`);

  // Un email que ya tiene un cliente, un documento repetido en el archivo y un email invalido.
  await modal.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([
      ENCABEZADO,
      `${lote}-Ana;Diaz;${documento};11 5555-0000;${lote.toLowerCase()}-ana@mymbpm.test;;;Quilmes;Buenos Aires;;Si`,
      `${lote}-Otro;;;;${lote.toUpperCase()}-YA@mymbpm.test;;;;;;`,
      `${lote}-Bruno;;${numero};;;;;;;;`,
      `${lote}-Carla;;;;no-es-mail;;;;;;tal vez`
    ])
  );
  const vista = modal.getByRole("region", { name: "Vista previa" });
  await expect(vista.getByTestId("importacion-resumen")).toHaveText("4 filas: 1 para importar, 3 con errores.");
  await expect(vista.getByRole("row").filter({ hasText: `${lote}-Otro` })).toContainText("Email: ya hay un cliente con ese email");
  await expect(vista.getByRole("row").filter({ hasText: `${lote}-Bruno` })).toContainText("Documento: repetido (fila 2)");
  await expect(vista.getByRole("row").filter({ hasText: `${lote}-Carla` })).toContainText('Email: "no-es-mail" no es un email valido');
  await expect(vista.getByRole("row").filter({ hasText: `${lote}-Carla` })).toContainText('Activo: "tal vez" tiene que ser Si o No');
  await expect(modal.getByRole("button", { name: /^Importar \d+ clientes$/ })).toBeDisabled();
  await revisarAccesibilidad(page, "importacion de clientes con errores");

  // Corregido: se importan juntos.
  await modal.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([
      ENCABEZADO,
      `${lote}-Ana;Diaz;${documento};11 5555-0000;${lote.toLowerCase()}-ana@mymbpm.test;@ana;Calle 1;Quilmes;Buenos Aires;Prefiere WhatsApp;Si`,
      `${lote}-Bruno;;;11 4444-0000;;;;Bernal;;;No`
    ])
  );
  await expect(vista.getByTestId("importacion-resumen")).toHaveText("2 filas: 2 para importar.");
  await modal.getByRole("button", { name: "Importar 2 clientes" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText("Se importaron 2 clientes.")).toBeVisible();

  const clientes = await api<Array<{ nombre: string; localidad: string | null; activo: boolean; documento: string | null }>>(
    "GET",
    `/api/clientes?busqueda=${encodeURIComponent(lote)}&limit=10`
  );
  expect(clientes.find((cliente) => cliente.nombre === `${lote}-Ana`)).toMatchObject({ localidad: "Quilmes", activo: true, documento });
  expect(clientes.find((cliente) => cliente.nombre === `${lote}-Bruno`)).toMatchObject({ activo: false });

  // Reimportar el mismo archivo: los mismos clientes no se duplican.
  const otra = await abrirImportacion(page);
  await otra.getByLabel("Archivo CSV").setInputFiles(
    archivoCsv([
      ENCABEZADO,
      `${lote}-Ana;;${numero};;;;;;;;`,
      `${lote}-Bruno;;;11-4444-0000;;;;;;;`
    ])
  );
  const otraVista = otra.getByRole("region", { name: "Vista previa" });
  await expect(otraVista.getByTestId("importacion-resumen")).toHaveText("2 filas: 0 para importar, 2 con errores.");
  await expect(otraVista.getByRole("row").filter({ hasText: `${lote}-Ana` })).toContainText("Documento: ya hay un cliente con ese documento");
  await expect(otraVista.getByRole("row").filter({ hasText: `${lote}-Bruno` })).toContainText(
    "Ya hay un cliente con el mismo nombre, apellido y telefono"
  );
});

test("un archivo sin la columna Nombre se rechaza antes de enviarlo", async ({ page }) => {
  const modal = await abrirImportacion(page);
  await modal.getByLabel("Archivo CSV").setInputFiles(archivoCsv(["Apellido;Telefono", "Diaz;11"]));

  await expect(modal.getByText("Al archivo le faltan columnas obligatorias: Nombre. Usa la plantilla.")).toBeVisible();
  await expect(modal.getByRole("region", { name: "Vista previa" })).toHaveCount(0);
});

test("un operador no ve la importacion de clientes ni la puede usar desde la API", async ({ browser }) => {
  const usuario = unico("prueba-operador-impcli").toLowerCase();
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

  for (const ruta of ["/api/clientes/importacion/previsualizar", "/api/clientes/importacion"]) {
    const respuesta = await fetch(`${URL_WEB}${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ filas: [{ nombre: "X" }] })
    });
    expect(respuesta.status).toBe(403);
  }

  const contexto = await browser.newContext({
    storageState: { cookies: [], origins: [{ origin: URL_WEB, localStorage: [{ name: "mlm_bpm_token", value: token }] }] }
  });
  const pagina = await contexto.newPage();
  await pagina.goto(`${URL_WEB}/clientes`);
  await expect(pagina.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();
  await expect(pagina.getByRole("button", { name: "Importar CSV" })).toHaveCount(0);
  await contexto.close();
});
