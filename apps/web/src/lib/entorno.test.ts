import { describe, expect, it } from "vitest";

import { esVistaPrevia } from "./entorno";

describe("esVistaPrevia", () => {
  it("avisa en los deploys de Netlify que no son produccion", () => {
    expect(esVistaPrevia("deploy-preview")).toBe(true);
    expect(esVistaPrevia("branch-deploy")).toBe(true);
  });

  it("no avisa en produccion ni fuera de Netlify (local, CI, E2E)", () => {
    expect(esVistaPrevia("production")).toBe(false);
    expect(esVistaPrevia("")).toBe(false);
  });
});
