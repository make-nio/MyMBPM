import { describe, expect, it } from "vitest";

import { generarSlug, leerNumero, validarFilas } from "./validar-filas";

const sinExistentes = { slugsItems: new Set<string>(), codigosItems: new Set<string>(), categorias: new Set<string>() };

describe("generarSlug", () => {
  it("saca acentos, pasa a minusculas y usa guiones", () => {
    expect(generarSlug("  Maceta Grande Ñandú (azul) ")).toBe("maceta-grande-nandu-azul");
  });
});

describe("leerNumero", () => {
  it("acepta punto decimal, coma decimal y miles con punto", () => {
    expect(leerNumero("1234.5")).toBe(1234.5);
    expect(leerNumero("1234,5")).toBe(1234.5);
    expect(leerNumero("$ 1.234,50")).toBe(1234.5);
    expect(leerNumero("abc")).toBeNull();
  });
});

describe("validarFilas", () => {
  it("convierte una fila valida y numera desde 2 (la 1 es el encabezado)", () => {
    const { filas, resumen } = validarFilas(
      [{ nombre: "Maceta", tipo: "producto", categoria: "Macetas", codigo: "MAC-1", precio: "1.500,50", costo: "400", stockMinimo: "3", activo: "no" }],
      sinExistentes
    );

    expect(filas[0]).toEqual({
      numero: 2,
      errores: [],
      item: expect.objectContaining({
        nombre: "Maceta",
        slug: "maceta",
        tipoItem: "PRODUCTO",
        categoria: "Macetas",
        codigo: "MAC-1",
        precio: 1500.5,
        costo: 400,
        stockMinimo: 3,
        activo: false
      })
    });
    expect(resumen).toEqual({ total: 1, validas: 1, conErrores: 0, categoriasNuevas: ["Macetas"] });
  });

  it("informa todos los errores de cada fila", () => {
    const { filas, resumen } = validarFilas(
      [{ nombre: "", tipo: "otro", categoria: "", precio: "caro", stockMinimo: "1,5", activo: "quizas" }],
      sinExistentes
    );

    expect(filas[0].item).toBeNull();
    expect(filas[0].errores).toEqual([
      "Nombre: es obligatorio",
      'Tipo: "otro" no es Producto ni Insumo',
      "Categoria: es obligatoria",
      'Precio: "caro" no es un numero valido',
      "Stock minimo: tiene que ser un numero entero",
      'Activo: "quizas" tiene que ser Si o No'
    ]);
    expect(resumen.conErrores).toBe(1);
  });

  it("detecta nombres y codigos repetidos en el archivo y ya existentes en el catalogo", () => {
    const { filas } = validarFilas(
      [
        { nombre: "Vela", tipo: "Producto", categoria: "Velas", codigo: "V1" },
        { nombre: "vela", tipo: "Producto", categoria: "Velas", codigo: "v1" },
        { nombre: "Llavero", tipo: "Producto", categoria: "Llaveros", codigo: "L1" }
      ],
      { slugsItems: new Set(["llavero"]), codigosItems: new Set(["l1"]), categorias: new Set(["velas"]) }
    );

    expect(filas[0].errores).toEqual([]);
    expect(filas[1].errores).toEqual(["Nombre: repetido en la fila 2", "Codigo: repetido en la fila 2"]);
    expect(filas[2].errores).toEqual([
      "Nombre: ya existe un item con ese nombre en el catalogo",
      "Codigo: ya lo usa otro item del catalogo"
    ]);
  });

  it("lista cada categoria nueva una sola vez, sin importar mayusculas", () => {
    const { resumen } = validarFilas(
      [
        { nombre: "A", tipo: "Insumo", categoria: "Filamentos" },
        { nombre: "B", tipo: "Insumo", categoria: "filamentos" },
        { nombre: "C", tipo: "Insumo", categoria: "Existente" }
      ],
      { ...sinExistentes, categorias: new Set(["existente"]) }
    );

    expect(resumen.categoriasNuevas).toEqual(["Filamentos"]);
  });
});
