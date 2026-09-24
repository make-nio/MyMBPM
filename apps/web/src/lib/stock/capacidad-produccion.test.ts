import { describe, expect, it } from "vitest";

import { calcularCapacidadProduccion } from "./capacidad-produccion";

const componente = (id: string, cantidadRequerida: string, activo = true) => ({
  idItemCatalogoHijo: id,
  nombreInsumo: `Insumo ${id}`,
  cantidadRequerida,
  activo
});

describe("calcularCapacidadProduccion", () => {
  it("el insumo que menos alcanza limita la produccion", () => {
    const { porComponente, unidades } = calcularCapacidadProduccion(
      [componente("I1", "1.5"), componente("I2", "2")],
      { I1: "10", I2: "5" }
    );

    expect(porComponente.map((c) => c.alcanzaPara)).toEqual([6, 2]);
    expect(unidades).toBe(2);
  });

  it("ignora componentes inactivos y trata sin stock como 0", () => {
    const { unidades } = calcularCapacidadProduccion([componente("I1", "1"), componente("I2", "1", false)], {});

    expect(unidades).toBe(0);
  });

  it("devuelve null si no hay receta activa", () => {
    expect(calcularCapacidadProduccion([componente("I1", "1", false)], { I1: "5" }).unidades).toBeNull();
  });

  it("no pierde una unidad por errores de punto flotante", () => {
    expect(calcularCapacidadProduccion([componente("I1", "0.1")], { I1: "0.3" }).unidades).toBe(3);
  });

  it("no devuelve capacidad negativa si el stock es negativo", () => {
    expect(calcularCapacidadProduccion([componente("I1", "1")], { I1: "-2" }).unidades).toBe(0);
  });
});
