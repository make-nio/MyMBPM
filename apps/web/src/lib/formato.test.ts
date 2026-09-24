import { describe, expect, it } from "vitest";

import { diaArgentina, formatearCantidad, formatearDia, formatearEstado, formatearFecha, formatearMoneda } from "./formato";

// Intl usa espacios duros (U+00A0) entre el simbolo y el monto.
const normalizar = (texto: string) => texto.replace(/\s/g, " ");

describe("formato", () => {
  it("formatea montos en pesos a partir de los Decimal serializados", () => {
    expect(normalizar(formatearMoneda("3001.5"))).toBe("$ 3.001,50");
    expect(normalizar(formatearMoneda(null))).toBe("$ 0,00");
  });

  it("formatea cantidades con hasta 3 decimales", () => {
    expect(formatearCantidad("1.500")).toBe("1,5");
    expect(formatearCantidad("0.1234")).toBe("0,123");
  });

  it("formatea fechas en hora de Argentina", () => {
    expect(formatearFecha("2026-09-24T03:00:00.000Z")).toBe("24/09/2026, 00:00");
    expect(formatearFecha(null)).toBe("-");
  });

  it("formatea dias sin hora en Argentina", () => {
    expect(formatearDia("2026-09-30T03:00:00.000Z")).toBe("30/09/2026");
    expect(formatearDia(null)).toBe("-");
  });

  it("devuelve el dia de Argentina como AAAA-MM-DD", () => {
    expect(diaArgentina("2026-09-30T03:00:00.000Z")).toBe("2026-09-30");
    // 01:00 UTC del 1/10 todavia es 30/09 en Argentina.
    expect(diaArgentina(new Date("2026-10-01T01:00:00Z"))).toBe("2026-09-30");
    expect(diaArgentina(null)).toBe("");
  });

  it("muestra los estados de dominio en lenguaje comun", () => {
    expect(formatearEstado("EN_PREPARACION")).toBe("En preparacion");
    expect(formatearEstado("SEÑADO")).toBe("Señado");
  });
});
