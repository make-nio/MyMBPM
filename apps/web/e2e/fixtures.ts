import { test as base, expect } from "@playwright/test";

import { COBERTURA_E2E } from "./entorno";
import { crearReporteCobertura } from "./cobertura";
import { revisarContrato } from "./contrato";

// Todas las pruebas importan test/expect de aca: con E2E_COVERAGE=1 cada pagina registra
// la cobertura JS del navegador, y cada respuesta de /api/* que recibe la pagina se valida contra
// el contrato de la API (apps/api/src/contrato): si una no lo cumple, la prueba falla.
export const test = base.extend({
  page: async ({ page }, use) => {
    if (COBERTURA_E2E) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    const problemas: string[] = [];
    const pendientes: Promise<void>[] = [];
    page.on("response", (respuesta) => {
      pendientes.push(revisarContrato(respuesta).then((encontrados) => void problemas.push(...encontrados)));
    });

    await use(page);

    if (COBERTURA_E2E) {
      await crearReporteCobertura().add(await page.coverage.stopJSCoverage());
    }

    await Promise.all(pendientes);
    expect(problemas, "respuestas de la API que no cumplen el contrato").toEqual([]);
  }
});

export { expect };

// Sufijo unico por corrida para no chocar con datos de corridas anteriores en la base local.
export function unico(prefijo: string) {
  return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
