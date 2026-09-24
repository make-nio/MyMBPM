import { describe, expect, it } from "vitest";

import { ErrorApi } from "./api";
import {
  columnaDuplicada,
  formatoEmail,
  hayErrores,
  igualA,
  largoMaximo,
  largoMinimo,
  numeroEntero,
  numeroMayorACero,
  numeroNoNegativo,
  requerido,
  resumenErrores,
  validarCampos
} from "./validacion";

describe("reglas de validacion", () => {
  it("requerido dice que falta y que hacer, y no acepta solo espacios", () => {
    expect(requerido("el nombre")("  ")).toBe("Falta el nombre: completalo para poder guardar.");
    expect(requerido("el nombre")("Maxi")).toBeNull();
  });

  it("los largos dicen cuanto hay y cuanto se permite", () => {
    expect(largoMaximo(3)("abcd")).toBe("Tiene 4 caracteres y el maximo es 3: acortalo.");
    expect(largoMaximo(3)("abc")).toBeNull();
    expect(largoMinimo(8, "La clave tiene que tener")("123")).toBe(
      "La clave tiene que tener al menos 8 caracteres (tiene 3): agrega los que faltan."
    );
    // Vacio lo resuelve requerido.
    expect(largoMinimo(8)("")).toBeNull();
  });

  it("el email explica la forma esperada", () => {
    expect(formatoEmail()("maxi")).toContain("nombre@dominio.com");
    expect(formatoEmail()("maxi@mym.com")).toBeNull();
    expect(formatoEmail()("")).toBeNull();
  });

  it("los numeros distinguen texto, negativos, cero y decimales", () => {
    expect(numeroMayorACero()("0")).toBe("Tiene que ser mayor a cero: escribi una cantidad positiva.");
    expect(numeroMayorACero()("abc")).toContain("No es un numero");
    expect(numeroMayorACero()("1.5")).toBeNull();
    expect(numeroMayorACero()("")).toBeNull();
    expect(numeroNoNegativo()("-1")).toContain("No puede ser negativo");
    expect(numeroNoNegativo()("0")).toBeNull();
    expect(numeroEntero()("2.5")).toContain("entero");
    expect(numeroEntero()("2")).toBeNull();
  });

  it("igualA compara con el otro valor", () => {
    expect(igualA("secreto1", "No coincide")("secreto2")).toBe("No coincide");
    expect(igualA("secreto1", "No coincide")("secreto1")).toBeNull();
  });
});

describe("validarCampos", () => {
  it("devuelve el primer error de cada campo y un resumen con la cantidad", () => {
    const errores = validarCampos({
      nombre: { valor: "", reglas: [requerido("el nombre"), largoMaximo(2)] },
      email: { valor: "x", reglas: [formatoEmail()] },
      apellido: { valor: "ok", reglas: [largoMaximo(10)] }
    });

    expect(errores).toEqual({
      nombre: "Falta el nombre: completalo para poder guardar.",
      email: "No parece un email: tiene que tener la forma nombre@dominio.com."
    });
    expect(hayErrores(errores)).toBe(true);
    expect(resumenErrores(errores)).toBe("Hay 2 datos para corregir: estan marcados debajo de cada campo.");
    expect(resumenErrores({ nombre: "x" })).toBe("Hay un dato para corregir: esta marcado debajo del campo.");
    expect(hayErrores({})).toBe(false);
  });
});

describe("columnaDuplicada", () => {
  it("toma la columna de un 409 con una sola columna", () => {
    expect(columnaDuplicada(new ErrorApi("dup", 409, null, { target: ["SLUG"] }))).toBe("SLUG");
  });

  it("ignora otros errores", () => {
    expect(columnaDuplicada(new ErrorApi("dup", 409, null, { target: ["A", "B"] }))).toBeNull();
    expect(columnaDuplicada(new ErrorApi("dup", 409, null, null))).toBeNull();
    expect(columnaDuplicada(new ErrorApi("mal", 400, null, { target: ["SLUG"] }))).toBeNull();
    expect(columnaDuplicada(new Error("x"))).toBeNull();
  });
});
