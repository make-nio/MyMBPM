import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditoriaRepository } from "./auditoria.repository";
import { accionDeModificacion, auditoriaService, calcularCambios, valorAuditable } from "./auditoria.service";

vi.mock("./auditoria.repository", () => ({
  auditoriaRepository: { registrar: vi.fn(), registrarVarios: vi.fn(), listar: vi.fn(), listarConCampos: vi.fn() }
}));

const repo = vi.mocked(auditoriaRepository);
const tx = { esTransaccion: true } as never;
const contexto = { entidad: "ITEM_CATALOGO" as const, idEntidad: 5n, idUsuario: 8n, campos: ["precio", "costo", "stockMinimo", "activo"] };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("valorAuditable", () => {
  it("guarda Decimal, BigInt, fechas y booleanos como texto, y vacio como null", () => {
    expect(valorAuditable(new Prisma.Decimal("1000.50"))).toBe("1000.5");
    expect(valorAuditable(7n)).toBe("7");
    expect(valorAuditable(new Date("2026-09-24T03:00:00Z"))).toBe("2026-09-24T03:00:00.000Z");
    expect(valorAuditable(false)).toBe("false");
    expect(valorAuditable(null)).toBeNull();
    expect(valorAuditable(undefined)).toBeNull();
    expect(valorAuditable("")).toBeNull();
  });
});

describe("calcularCambios", () => {
  it("solo devuelve los campos que cambiaron, con antes y despues", () => {
    const antes = { precio: new Prisma.Decimal("100"), costo: new Prisma.Decimal("40"), stockMinimo: 2, activo: true };
    const despues = { precio: new Prisma.Decimal("120.00"), costo: new Prisma.Decimal("40.00"), stockMinimo: 5, activo: true };

    expect(calcularCambios(antes, despues, contexto.campos)).toEqual([
      { campo: "precio", antes: "100", despues: "120" },
      { campo: "stockMinimo", antes: "2", despues: "5" }
    ]);
  });

  it("un campo opcional que pasa de null a vacio no es un cambio", () => {
    expect(calcularCambios({ codigo: null }, { codigo: "" }, ["codigo"])).toEqual([]);
  });

  it("en un alta lista los campos con valor, sin antes", () => {
    expect(calcularCambios(null, { precio: new Prisma.Decimal("10"), costo: null, stockMinimo: 0, activo: true }, contexto.campos)).toEqual([
      { campo: "precio", antes: null, despues: "10" },
      { campo: "stockMinimo", antes: null, despues: "0" },
      { campo: "activo", antes: null, despues: "true" }
    ]);
  });
});

describe("accionDeModificacion", () => {
  it("si solo cambio activo es activacion o desactivacion", () => {
    expect(accionDeModificacion([{ campo: "activo", antes: "true", despues: "false" }])).toBe("DESACTIVACION");
    expect(accionDeModificacion([{ campo: "activo", antes: "false", despues: "true" }])).toBe("ACTIVACION");
    expect(
      accionDeModificacion([
        { campo: "activo", antes: "false", despues: "true" },
        { campo: "precio", antes: "1", despues: "2" }
      ])
    ).toBe("MODIFICACION");
  });
});

describe("auditoriaService.registrarModificacion", () => {
  it("registra en la transaccion recibida con el usuario", async () => {
    await auditoriaService.registrarModificacion(tx, contexto, { precio: 1, costo: 1, stockMinimo: 0, activo: true }, {
      precio: 2,
      costo: 1,
      stockMinimo: 0,
      activo: true
    });

    expect(repo.registrar).toHaveBeenCalledWith(tx, {
      entidad: "ITEM_CATALOGO",
      idEntidad: 5n,
      accion: "MODIFICACION",
      cambios: [{ campo: "precio", antes: "1", despues: "2" }],
      idUsuario: 8n
    });
  });

  it("guardar sin cambios reales no deja registro", async () => {
    const registro = { precio: 1, costo: 1, stockMinimo: 0, activo: true };

    await auditoriaService.registrarModificacion(tx, contexto, registro, { ...registro });

    expect(repo.registrar).not.toHaveBeenCalled();
  });
});

describe("auditoriaService.registrarAltas", () => {
  it("arma un alta por registro con sus campos y la guarda en una sola llamada", async () => {
    await auditoriaService.registrarAltas(
      "tx" as never,
      { entidad: "ITEM_CATALOGO", idUsuario: 7n, campos: ["nombre", "precio"] },
      [
        { idEntidad: 1n, registro: { nombre: "Vela", precio: null } },
        { idEntidad: 2n, registro: { nombre: "Maceta", precio: "10" } }
      ]
    );

    expect(repo.registrarVarios).toHaveBeenCalledWith("tx", [
      { entidad: "ITEM_CATALOGO", idEntidad: 1n, accion: "ALTA", cambios: [{ campo: "nombre", antes: null, despues: "Vela" }], idUsuario: 7n },
      {
        entidad: "ITEM_CATALOGO",
        idEntidad: 2n,
        accion: "ALTA",
        cambios: [
          { campo: "nombre", antes: null, despues: "Maceta" },
          { campo: "precio", antes: null, despues: "10" }
        ],
        idUsuario: 7n
      }
    ]);
  });
});

describe("auditoriaService.listarPrecios", () => {
  it("pide solo los registros de precio o costo del item y deja de lado los otros campos", async () => {
    const fecha = new Date("2026-09-20T12:00:00Z");
    const usuario = { idUsuario: 8n, nombre: "Maxi", apellido: "M" };
    repo.listarConCampos.mockResolvedValue([
      {
        idAuditoriaCambio: 12n,
        fecha,
        accion: "MODIFICACION",
        usuario,
        cambios: [
          { campo: "nombre", antes: "A", despues: "B" },
          { campo: "precio", antes: "100", despues: "120" }
        ]
      },
      {
        idAuditoriaCambio: 3n,
        fecha,
        accion: "ALTA",
        usuario: null,
        cambios: [
          { campo: "precio", antes: null, despues: "100" },
          { campo: "costo", antes: null, despues: "40" }
        ]
      }
    ] as never);

    const puntos = await auditoriaService.listarPrecios({ idItemCatalogo: 5n, limit: 50, offset: 0 });

    expect(repo.listarConCampos).toHaveBeenCalledWith({
      entidad: "ITEM_CATALOGO",
      idEntidad: 5n,
      campos: ["precio", "costo"],
      limit: 50,
      offset: 0
    });
    expect(puntos).toEqual([
      { idAuditoriaCambio: 12n, fecha, accion: "MODIFICACION", usuario, precio: { antes: "100", despues: "120" }, costo: null },
      {
        idAuditoriaCambio: 3n,
        fecha,
        accion: "ALTA",
        usuario: null,
        precio: { antes: null, despues: "100" },
        costo: { antes: null, despues: "40" }
      }
    ]);
  });
});
