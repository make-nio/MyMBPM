import { describe, expect, it } from "vitest";

import { calcularImpactoStock, hayStockInsuficiente } from "./impacto-stock";

const linea = (idItemCatalogo: string, cantidad: string, nombre = `Item ${idItemCatalogo}`) => ({
  idItemCatalogo,
  cantidad,
  nombreItemSnapshot: nombre
});

describe("calcularImpactoStock", () => {
  it("calcula disponible, egreso y resultante por item", () => {
    const impacto = calcularImpactoStock([linea("1", "3")], { "1": "10" });

    expect(impacto).toEqual([
      { idItemCatalogo: "1", nombre: "Item 1", disponible: 10, egreso: 3, resultante: 7, insuficiente: false }
    ]);
  });

  it("suma las lineas del mismo item contra el mismo stock", () => {
    const impacto = calcularImpactoStock([linea("1", "2"), linea("2", "1"), linea("1", "4")], {
      "1": "5",
      "2": "1"
    });

    expect(impacto.map(({ idItemCatalogo, egreso, resultante, insuficiente }) => ({
      idItemCatalogo,
      egreso,
      resultante,
      insuficiente
    }))).toEqual([
      { idItemCatalogo: "1", egreso: 6, resultante: -1, insuficiente: true },
      { idItemCatalogo: "2", egreso: 1, resultante: 0, insuficiente: false }
    ]);
  });

  it("toma 0 como stock si el item no tiene movimientos", () => {
    const [item] = calcularImpactoStock([linea("9", "1")], {});

    expect(item).toMatchObject({ disponible: 0, resultante: -1, insuficiente: true });
  });

  it("no arrastra errores de punto flotante", () => {
    const [item] = calcularImpactoStock([linea("1", "0.1"), linea("1", "0.2")], { "1": "0.3" });

    expect(item.resultante).toBe(0);
    expect(item.insuficiente).toBe(false);
  });
});

describe("hayStockInsuficiente", () => {
  it("es verdadero si algun item queda negativo", () => {
    expect(hayStockInsuficiente(calcularImpactoStock([linea("1", "2")], { "1": "1" }))).toBe(true);
    expect(hayStockInsuficiente(calcularImpactoStock([linea("1", "1")], { "1": "1" }))).toBe(false);
  });
});
