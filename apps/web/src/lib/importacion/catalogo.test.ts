import { describe, expect, it } from "vitest";

import { leerCsv } from "../csv";
import { mapearFilasCatalogo, plantillaCatalogo } from "./catalogo";

describe("leerCsv", () => {
  it("lee ; con comillas, comillas dobles, saltos de linea adentro, BOM y CRLF", () => {
    const texto = '﻿Nombre;Descripcion\r\n"Maceta; grande";"dice ""hola""\ny chau"\r\n\r\nVela;\r\n';

    expect(leerCsv(texto)).toEqual([
      ["Nombre", "Descripcion"],
      ["Maceta; grande", 'dice "hola"\ny chau'],
      ["Vela", ""]
    ]);
  });

  it("detecta la coma como separador si el encabezado la usa", () => {
    expect(leerCsv("Nombre,Tipo\nVela,Producto")).toEqual([
      ["Nombre", "Tipo"],
      ["Vela", "Producto"]
    ]);
  });
});

describe("mapearFilasCatalogo", () => {
  it("busca las columnas por nombre, sin importar orden, mayusculas ni acentos", () => {
    const { filas, faltantes } = mapearFilasCatalogo([
      ["CATEGORÍA", " tipo ", "Nombre", "Stock mínimo", "Otra"],
      ["Macetas", "Producto", "Maceta", "3", "x"]
    ]);

    expect(faltantes).toEqual([]);
    expect(filas).toEqual([{ categoria: "Macetas", tipo: "Producto", nombre: "Maceta", stockMinimo: "3" }]);
  });

  it("avisa las columnas obligatorias que faltan", () => {
    expect(mapearFilasCatalogo([["Nombre", "Precio"]]).faltantes).toEqual(["Tipo", "Categoria"]);
  });

  it("la plantilla se vuelve a leer sin perder datos", () => {
    const { filas, faltantes } = mapearFilasCatalogo(leerCsv(plantillaCatalogo()));

    expect(faltantes).toEqual([]);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({ nombre: "Maceta cubo 10 cm", tipo: "Producto", categoria: "Macetas", precio: "3500" });
  });
});
