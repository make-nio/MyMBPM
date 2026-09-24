import { describe, expect, it } from "vitest";

import { formatearCantidad, formatearEstado, formatearFecha, formatearMoneda } from "./formato";

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

  it("muestra los estados de dominio en lenguaje comun", () => {
    expect(formatearEstado("EN_PREPARACION")).toBe("En preparacion");
    expect(formatearEstado("SEÑADO")).toBe("Señado");
  });
});
