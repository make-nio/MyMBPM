import { Prisma, PrismaClient } from "@prisma/client";

import { AccionAuditoria, EntidadAuditada } from "../../compartido/dominio/enums";
import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export type CambioAuditado = { campo: string; antes: string | null; despues: string | null };

// Un deploy preview corre contra la base de produccion sin migrar: ahi AUDITORIA_CAMBIO puede no
// existir todavia. El registro va dentro de la transaccion del cambio y en Postgres un INSERT
// fallido aborta toda la transaccion, asi que no alcanza con atrapar el error: se pregunta antes
// si la tabla existe (una vez por instancia) y, si no, el cambio se guarda sin registro.
let tablaDisponible: Promise<boolean> | null = null;

export function hayTablaAuditoria() {
  tablaDisponible ??= prisma
    .$queryRaw<{ existe: boolean }[]>`SELECT to_regclass('"AUDITORIA_CAMBIO"') IS NOT NULL AS existe`
    .then((filas) => {
      if (!filas[0]?.existe) {
        console.warn("AUDITORIA_CAMBIO no existe (falta migrar): los cambios se guardan sin historial");
      }

      return Boolean(filas[0]?.existe);
    })
    .catch((error: unknown) => {
      tablaDisponible = null;
      throw error;
    });

  return tablaDisponible;
}

// Solo para pruebas.
export function olvidarTablaAuditoria() {
  tablaDisponible = null;
}

export const auditoriaRepository = {
  async registrar(
    db: PrismaOrTx,
    data: {
      entidad: EntidadAuditada;
      idEntidad: bigint;
      accion: AccionAuditoria;
      cambios: CambioAuditado[];
      idUsuario?: bigint;
    }
  ) {
    if (!(await hayTablaAuditoria())) {
      return null;
    }

    return db.auditoriaCambio.create({ data });
  },

  // Solo id, nombre y apellido del usuario: nunca claveHash.
  async listar(filtros: { entidad: EntidadAuditada; idEntidad: bigint; limit: number; offset: number }) {
    if (!(await hayTablaAuditoria())) {
      return [];
    }

    return prisma.auditoriaCambio.findMany({
      where: { entidad: filtros.entidad, idEntidad: filtros.idEntidad },
      include: { usuario: { select: { idUsuario: true, nombre: true, apellido: true } } },
      orderBy: { idAuditoriaCambio: "desc" },
      skip: filtros.offset,
      take: filtros.limit
    });
  }
};
