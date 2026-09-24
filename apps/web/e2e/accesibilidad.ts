import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect } from "./fixtures";

// Reglas WCAG 2.1 A y AA. La prueba falla ante violaciones "serious" o "critical"; las menores se
// informan en la salida pero no cortan.
const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const IMPACTOS_QUE_FALLAN = new Set(["serious", "critical"]);

export async function revisarAccesibilidad(page: Page, contexto: string) {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  const describir = (v: (typeof resultado.violations)[number]) =>
    `[${v.impact}] ${v.id}: ${v.help}\n${v.nodes
      .slice(0, 5)
      .map((nodo) => `    ${nodo.target.join(" ")}`)
      .join("\n")}`;

  const menores = resultado.violations.filter((v) => !IMPACTOS_QUE_FALLAN.has(v.impact ?? ""));
  if (menores.length > 0) {
    console.log(`Accesibilidad (${contexto}), menores:\n${menores.map(describir).join("\n")}`);
  }

  const graves = resultado.violations.filter((v) => IMPACTOS_QUE_FALLAN.has(v.impact ?? ""));
  expect(graves.map(describir), `Violaciones graves de accesibilidad en ${contexto}`).toEqual([]);
}
