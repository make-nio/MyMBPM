import { describe, expect, it } from "vitest";

import { claveDocumento, clavePersona, validarFilasClientes } from "./validar-filas-clientes";

const vacio = () => ({ emails: new Set<string>(), documentos: new Set<string>(), personas: new Set<string>() });

describe("validarFilasClientes", () => {
  it("convierte una fila valida, con activo por defecto y sin espacios de mas", () => {
    const { filas, resumen } = validarFilasClientes(
      [{ nombre: "  Ana ", apellido: "Diaz", email: "ANA@mail.com", telefono: "11 5555-0000", activo: "" }],
      vacio()
    );

    expect(resumen).toEqual({ total: 1, validas: 1, conErrores: 0 });
    expect(filas[0]).toMatchObject({ numero: 2, errores: [], cliente: { nombre: "Ana", apellido: "Diaz", email: "ANA@mail.com", activo: true } });
  });

  it("marca nombre faltante, email invalido, largos y activo raro", () => {
    const { filas, resumen } = validarFilasClientes(
      [{ nombre: "", email: "no-es-mail", documento: "1".repeat(31), activo: "tal vez" }],
      vacio()
    );

    expect(resumen.conErrores).toBe(1);
    expect(filas[0].cliente).toBeNull();
    expect(filas[0].errores).toEqual([
      "Nombre: es obligatorio",
      "Documento: hasta 30 caracteres",
      'Email: "no-es-mail" no es un email valido',
      'Activo: "tal vez" tiene que ser Si o No'
    ]);
  });

  it("detecta clientes que ya existen por email, documento o nombre+apellido+telefono", () => {
    const existentes = {
      emails: new Set(["ana@mail.com"]),
      documentos: new Set([claveDocumento("20.123.456")]),
      personas: new Set([clavePersona("Bruno", undefined, "11-4444-0000")])
    };

    const { filas } = validarFilasClientes(
      [
        { nombre: "Otra Ana", email: " Ana@Mail.com " },
        { nombre: "Carlos", documento: "20123456" },
        { nombre: "bruno", telefono: "11 4444 0000" },
        { nombre: "Bruno", telefono: "11 9999 0000" }
      ],
      existentes
    );

    expect(filas.map((fila) => fila.errores)).toEqual([
      ["Email: ya hay un cliente con ese email"],
      ["Documento: ya hay un cliente con ese documento"],
      ["Ya hay un cliente con el mismo nombre, apellido y telefono"],
      []
    ]);
  });

  it("detecta repetidos dentro del mismo archivo, indicando la fila", () => {
    const { filas } = validarFilasClientes(
      [
        { nombre: "Ana", email: "ana@mail.com" },
        { nombre: "Ana Maria", email: "ANA@mail.com" },
        { nombre: "Dario", documento: "30.111.222" },
        { nombre: "Dario 2", documento: "30111222" }
      ],
      vacio()
    );

    expect(filas[1].errores).toEqual(["Email: repetido (fila 2)"]);
    expect(filas[3].errores).toEqual(["Documento: repetido (fila 4)"]);
  });

  it("dos clientes con el mismo nombre y sin mas datos no son repetidos", () => {
    const { resumen } = validarFilasClientes([{ nombre: "Ana" }, { nombre: "Ana" }], vacio());

    expect(resumen.conErrores).toBe(0);
  });
});
