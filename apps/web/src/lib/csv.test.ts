import { describe, expect, it } from "vitest";

import { celdaCsv, diaParaNombreArchivo, generarCsv, numeroCsv } from "./csv";

describe("csv", () => {
  it("deja el texto simple como esta y las celdas vacias en blanco", () => {
    expect(celdaCsv("Vela aromatica")).toBe("Vela aromatica");
    expect(celdaCsv(null)).toBe("");
    expect(celdaCsv(undefined)).toBe("");
  });

  it("entrecomilla lo que tiene separador, comillas o saltos de linea", () => {
    expect(celdaCsv("uno; dos")).toBe('"uno; dos"');
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celdaCsv("linea 1\nlinea 2")).toBe('"linea 1\nlinea 2"');
  });

  it("neutraliza texto que Excel tomaria como formula, pero no los numeros negativos", () => {
    expect(celdaCsv("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(celdaCsv("@cliente")).toBe("'@cliente");
    expect(celdaCsv("-4,5")).toBe("-4,5");
  });

  it("escribe los decimales con coma y sin separador de miles", () => {
    expect(numeroCsv("3001.50")).toBe("3001,5");
    expect(numeroCsv(-2)).toBe("-2");
    expect(numeroCsv(null)).toBe("");
  });

  it("arma el archivo con BOM, encabezados, ';' y CRLF", () => {
    expect(generarCsv(["Item", "Stock"], [["Vela", "3"], ["Maceta; chica", "1,5"]])).toBe(
      '﻿Item;Stock\r\nVela;3\r\n"Maceta; chica";1,5\r\n'
    );
  });

  it("nombra el archivo con el dia de Argentina", () => {
    expect(diaParaNombreArchivo(new Date("2026-10-01T01:00:00Z"))).toBe("2026-09-30");
  });
});
