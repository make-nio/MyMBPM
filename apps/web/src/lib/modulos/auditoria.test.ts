import { describe, expect, it } from "vitest";

import { describirCambio } from "./auditoria";

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
