import { describe, expect, it } from "vitest";

import { alturasRelativas, etiquetaMesCorta, etiquetaMesLarga } from "./grafico";

describe("grafico de ventas", () => {
  it("etiquetas de mes", () => {
    expect(etiquetaMesCorta("2026-09")).toBe("sep 26");
    expect(etiquetaMesCorta("2025-12")).toBe("dic 25");
    expect(etiquetaMesLarga("2026-01")).toBe("enero 2026");
  });

  it("alturas relativas al mes de mayor venta", () => {
    expect(alturasRelativas([0, 500, 1000, 250])).toEqual([0, 0.5, 1, 0.25]);
  });

  it("sin ventas, todas en cero", () => {
    expect(alturasRelativas([0, 0, 0])).toEqual([0, 0, 0]);
    expect(alturasRelativas([])).toEqual([]);
  });
});
