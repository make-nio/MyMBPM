import { describe, expect, it } from "vitest";

import { calcularImpactoStock } from "../stock/impacto-stock";
import { calcularConsumosPrevistos } from "./consumo-insumos";

const componente = (idItemCatalogoHijo: string, cantidadRequerida: string, activo = true) => ({
  idItemCatalogoHijo,
  nombreInsumo: `Insumo ${idItemCatalogoHijo}`,
  cantidadRequerida,
  activo
});

describe("calcularConsumosPrevistos", () => {
  it("multiplica la cantidad a fabricar por lo que pide la receta", () => {
    const { egresos, productosSinReceta } = calcularConsumosPrevistos(
      [{ idItemCatalogoProducto: "P1", nombreProducto: "Vela", cantidad: "4" }],
      { P1: [componente("I1", "1.5"), componente("I2", "2")] }
    );

    expect(egresos).toEqual([
      { idItemCatalogo: "I1", nombre: "Insumo I1", cantidad: 6 },
      { idItemCatalogo: "I2", nombre: "Insumo I2", cantidad: 8 }
    ]);
    expect(productosSinReceta).toEqual([]);
  });

  it("ignora componentes inactivos, como la API", () => {
    const { egresos } = calcularConsumosPrevistos(
      [{ idItemCatalogoProducto: "P1", nombreProducto: "Vela", cantidad: "1" }],
      { P1: [componente("I1", "1"), componente("I2", "5", false)] }
    );

    expect(egresos.map((egreso) => egreso.idItemCatalogo)).toEqual(["I1"]);
  });

  it("informa los productos sin receta activa", () => {
    const { egresos, productosSinReceta } = calcularConsumosPrevistos(
      [
        { idItemCatalogoProducto: "P1", nombreProducto: "Vela", cantidad: "1" },
        { idItemCatalogoProducto: "P2", nombreProducto: "Maceta", cantidad: "1" }
      ],
      { P1: [componente("I1", "1", false)] }
    );

    expect(egresos).toEqual([]);
    expect(productosSinReceta).toEqual(["Vela", "Maceta"]);
  });

  it("suma el mismo insumo de distintos productos al calcular el impacto", () => {
    const { egresos } = calcularConsumosPrevistos(
      [
        { idItemCatalogoProducto: "P1", nombreProducto: "Vela", cantidad: "4" },
        { idItemCatalogoProducto: "P2", nombreProducto: "Maceta", cantidad: "2" }
      ],
      { P1: [componente("I1", "1.5")], P2: [componente("I1", "0.25")] }
    );

    const [cera] = calcularImpactoStock(egresos, { I1: "6" });
    expect(cera).toMatchObject({ egreso: 6.5, resultante: -0.5, insuficiente: true });
  });
});
