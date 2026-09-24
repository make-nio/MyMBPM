import { describe, expect, it } from "vitest";

import { calcularCostoReceta, calcularMargenPedido } from "./costos";

describe("calcularMargenPedido", () => {
  it("resta al total el costo de cada linea (costo x cantidad)", () => {
    expect(
      calcularMargenPedido("2376.00", [
        { cantidad: "2", costoUnitario: "400.25" },
        { cantidad: "1.5", costoUnitario: "100" }
      ])
    ).toEqual({ costo: 950.5, ganancia: 1425.5, porcentaje: 60, lineasSinCosto: 0 });
  });

  it("avisa las lineas sin costo cargado y no divide por cero", () => {
    expect(calcularMargenPedido("0", [{ cantidad: "1", costoUnitario: "0.00" }])).toEqual({
      costo: 0,
      ganancia: 0,
      porcentaje: null,
      lineasSinCosto: 1
    });
  });
});

describe("calcularCostoReceta", () => {
  it("suma cantidad por costo de los componentes activos e informa los que no tienen costo", () => {
    expect(
      calcularCostoReceta([
        { cantidadRequerida: "0.150", activo: true, itemCatalogoComponente: { nombre: "PLA", costo: "25000" } },
        { cantidadRequerida: "2", activo: true, itemCatalogoComponente: { nombre: "Iman", costo: null } },
        { cantidadRequerida: "5", activo: false, itemCatalogoComponente: { nombre: "Viejo", costo: "999" } }
      ])
    ).toEqual({ costo: 3750, sinCosto: ["Iman"] });
  });
});
