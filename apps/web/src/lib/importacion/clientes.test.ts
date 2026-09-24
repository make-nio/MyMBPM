import { describe, expect, it } from "vitest";

import { leerCsv } from "../csv";
import { mapearFilasClientes, plantillaClientes } from "./clientes";

describe("importacion de clientes", () => {
  it("la plantilla se lee de vuelta con todas sus columnas", () => {
    const { filas, faltantes } = mapearFilasClientes(leerCsv(plantillaClientes()));

    expect(faltantes).toEqual([]);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({ nombre: "Ana", apellido: "Diaz", email: "ana@ejemplo.com", activo: "Si" });
  });

  it("encuentra las columnas en cualquier orden y sin importar acentos ni mayusculas", () => {
    const { filas } = mapearFilasClientes([
      ["TELÉFONO", "nombre", "Columna rara"],
      ["11 2222", "Carla", "x"]
    ]);

    expect(filas).toEqual([{ telefono: "11 2222", nombre: "Carla" }]);
  });

  it("avisa si falta la columna obligatoria", () => {
    expect(mapearFilasClientes([["Apellido"], ["Diaz"]]).faltantes).toEqual(["Nombre"]);
  });
});
