import { test as base, expect } from "@playwright/test";

import { COBERTURA_E2E } from "./entorno";
import { crearReporteCobertura } from "./cobertura";

// Todas las pruebas importan test/expect de aca: con E2E_COVERAGE=1 cada pagina registra
// la cobertura JS del navegador.
export const test = base.extend({
  page: async ({ page }, use) => {
    if (COBERTURA_E2E) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    await use(page);

    if (COBERTURA_E2E) {
      await crearReporteCobertura().add(await page.coverage.stopJSCoverage());
    }
  }
});

export { expect };

// Sufijo unico por corrida para no chocar con datos de corridas anteriores en la base local.
export function unico(prefijo: string) {
  return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
