import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";

import { importacionClientesRepository } from "./importacion-clientes.repository";
import { importacionClientesService } from "./importacion-clientes.service";

const tx = { esTransaccion: true };

vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("../auditoria/auditoria.service", () => ({ auditoriaService: { registrarAltas: vi.fn() } }));
vi.mock("./importacion-clientes.repository", () => ({
  importacionClientesRepository: { bloquearImportacion: vi.fn(), buscarCandidatos: vi.fn(), crearClientes: vi.fn() }
}));

const repo = vi.mocked(importacionClientesRepository);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (cliente: typeof tx) => unknown) => fn(tx)) as never);
  repo.buscarCandidatos.mockResolvedValue([]);
  repo.crearClientes.mockImplementation((async (_tx: unknown, datos: Array<Record<string, unknown>>) =>
    datos.map((dato, indice) => ({ ...dato, idCliente: 50n + BigInt(indice) }))) as never);
});

const filas = [
  { nombre: "Ana", email: "Ana@Mail.com", telefono: "11 5555-0000", documento: "20.123.456" },
  { nombre: "Bruno", telefono: "" }
];

describe("importacionClientesService", () => {
  it("previsualizar busca solo los candidatos del archivo, normalizados, y no escribe", async () => {
    const { resumen } = await importacionClientesService.previsualizar(filas);

    expect(resumen).toEqual({ total: 2, validas: 2, conErrores: 0 });
    expect(repo.buscarCandidatos).toHaveBeenCalledWith(prisma, ["ana@mail.com"], ["20123456"], ["1155550000"]);
    expect(repo.crearClientes).not.toHaveBeenCalled();
  });

  it("previsualizar marca un cliente que ya existe en la base", async () => {
    repo.buscarCandidatos.mockResolvedValue([
      { nombre: "Ana", apellido: null, documento: null, telefono: null, email: "ana@mail.com" }
    ]);

    const { filas: validadas } = await importacionClientesService.previsualizar(filas);

    expect(validadas[0].errores).toEqual(["Email: ya hay un cliente con ese email"]);
  });

  it("importar crea todo en una transaccion con lock y auditoria", async () => {
    const resultado = await importacionClientesService.importar(filas, 8n);

    expect(repo.bloquearImportacion).toHaveBeenCalledWith(tx);
    expect(repo.crearClientes).toHaveBeenCalledWith(tx, [
      expect.objectContaining({ nombre: "Ana", email: "Ana@Mail.com", activo: true }),
      expect.objectContaining({ nombre: "Bruno", telefono: undefined })
    ]);
    expect(auditoriaService.registrarAltas).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ entidad: "CLIENTE", idUsuario: 8n }),
      [expect.objectContaining({ idEntidad: 50n }), expect.objectContaining({ idEntidad: 51n })]
    );
    expect(resultado).toEqual({ creados: 2 });
  });

  it("importar es todo o nada: con una fila mal no crea ninguna", async () => {
    await expect(importacionClientesService.importar([...filas, { nombre: "" }])).rejects.toBeInstanceOf(ErrorConflicto);

    expect(repo.crearClientes).not.toHaveBeenCalled();
    expect(auditoriaService.registrarAltas).not.toHaveBeenCalled();
  });
});
