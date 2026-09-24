import { describe, expect, it } from "vitest";

import { describirCambio, describirPrecio } from "./auditoria";

const normalizar = (texto: string) => texto.replace(/\s/g, " ");

describe("describirCambio", () => {
  it("muestra precio y costo como moneda, con antes y despues", () => {
    expect(normalizar(describirCambio({ campo: "precio", antes: "100", despues: "120.5" }))).toBe(
      "Precio: $ 100,00 → $ 120,50"
    );
  });

  it("traduce booleanos y valores vacios", () => {
    expect(describirCambio({ campo: "activo", antes: "true", despues: "false" })).toBe("Activo: Si → No");
    expect(describirCambio({ campo: "telefono", antes: "111", despues: null })).toBe("Telefono: 111 → (vacio)");
  });

  it("en un alta muestra solo el valor inicial", () => {
    expect(describirCambio({ campo: "stockMinimo", antes: null, despues: "5" })).toBe("Stock minimo: 5");
  });
});

describe("describirPrecio", () => {
  // Segun la version de ICU el porcentaje sale "20%" o "20 %".
  const sinEspacioEnPorcentaje = (texto: string) => normalizar(texto).replace(/ %/g, "%");

  it("muestra antes, despues y la variacion", () => {
    expect(sinEspacioEnPorcentaje(describirPrecio({ antes: "100", despues: "120" }))).toBe("$ 100,00 → $ 120,00 (+20%)");
    expect(sinEspacioEnPorcentaje(describirPrecio({ antes: "200", despues: "150" }))).toBe("$ 200,00 → $ 150,00 (-25%)");
  });

  it("sin valor anterior muestra solo el nuevo; si se borra, (vacio) y sin variacion", () => {
    expect(normalizar(describirPrecio({ antes: null, despues: "80" }))).toBe("$ 80,00");
    expect(normalizar(describirPrecio({ antes: "80", despues: null }))).toBe("$ 80,00 → (vacio)");
  });

  it("desde cero no calcula variacion", () => {
    expect(normalizar(describirPrecio({ antes: "0", despues: "50" }))).toBe("$ 0,00 → $ 50,00");
  });
});
