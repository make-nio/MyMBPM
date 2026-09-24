import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";
import { CAMPOS_AUDITADOS_CLIENTE } from "../clientes/clientes.service";

import { importacionClientesRepository } from "./importacion-clientes.repository";
import { FilaImportacionCliente } from "./importacion-clientes.schemas";
import { claveDocumento, claveEmail, clavePersona, validarFilasClientes } from "./validar-filas-clientes";

type Db = Parameters<typeof importacionClientesRepository.buscarCandidatos>[0];

async function validarContraBase(db: Db, filas: FilaImportacionCliente[]) {
  const valores = (campo: keyof FilaImportacionCliente, normalizar: (valor: string) => string) => [
    ...new Set(filas.map((fila) => fila[campo]?.trim() ?? "").filter(Boolean).map(normalizar).filter(Boolean))
  ];
  const candidatos = await importacionClientesRepository.buscarCandidatos(
    db,
    valores("email", claveEmail),
    valores("documento", claveDocumento),
    valores("telefono", (telefono) => telefono.replace(/\D/g, ""))
  );

  return validarFilasClientes(filas, {
    emails: new Set(candidatos.flatMap((cliente) => (cliente.email ? [claveEmail(cliente.email)] : []))),
    documentos: new Set(candidatos.flatMap((cliente) => (cliente.documento ? [claveDocumento(cliente.documento)] : []))),
    personas: new Set(
      candidatos.flatMap((cliente) =>
        cliente.telefono ? [clavePersona(cliente.nombre, cliente.apellido ?? undefined, cliente.telefono)] : []
      )
    )
  });
}

export const importacionClientesService = {
  // Lo que pasaria si se importa: errores por fila. No escribe.
  previsualizar(filas: FilaImportacionCliente[]) {
    return validarContraBase(prisma, filas);
  },

  // Todo o nada: se vuelve a validar dentro de la transaccion (con un lock, por si hay dos
  // importaciones a la vez) y, si alguna fila tiene errores, no se crea nada.
  importar(filas: FilaImportacionCliente[], idUsuario?: bigint) {
    return prisma.$transaction(
      async (tx) => {
        await importacionClientesRepository.bloquearImportacion(tx);
        const { filas: validadas, resumen } = await validarContraBase(tx, filas);

        if (resumen.conErrores > 0) {
          throw new ErrorConflicto(
            `Hay ${resumen.conErrores} ${resumen.conErrores === 1 ? "fila con errores" : "filas con errores"}: no se importo nada`,
            { filas: validadas.filter((fila) => fila.errores.length > 0), resumen }
          );
        }

        const creados = await importacionClientesRepository.crearClientes(
          tx,
          validadas.flatMap(({ cliente }) => (cliente ? [cliente] : []))
        );
        await auditoriaService.registrarAltas(
          tx,
          { entidad: "CLIENTE", idUsuario, campos: CAMPOS_AUDITADOS_CLIENTE },
          creados.map((creado) => ({ idEntidad: creado.idCliente, registro: creado }))
        );

        return { creados: creados.length };
      },
      { timeout: 60_000, maxWait: 10_000 }
    );
  }
};
