import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const ID_CONFIGURACION = 1;

type ActualizarConfiguracionInput = {
  cancelarPedido?: string;
  cancelarOrden?: string;
  devolucionStock?: string;
  devolucionReintegro?: string;
};

// P2021: la tabla no existe. Pasa en un deploy preview (usa la base de produccion y no migra)
// hasta que la migracion de CONFIGURACION llega a produccion. Se lee fuera de toda transaccion:
// en Postgres, una consulta que falla dentro de una transaccion la aborta entera.
function faltaLaTabla(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

// P2022: falta una columna. Pasa en un preview cuando la tabla ya esta en produccion pero sin las
// columnas de una migracion posterior (las de la devolucion, #96): se leen las que hay.
function faltaUnaColumna(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
}

export const configuracionRepository = {
  async obtener() {
    try {
      return await prisma.configuracion.findUnique({ where: { idConfiguracion: ID_CONFIGURACION } });
    } catch (error) {
      if (faltaUnaColumna(error)) {
        return prisma.configuracion.findUnique({
          where: { idConfiguracion: ID_CONFIGURACION },
          select: { cancelarPedido: true, cancelarOrden: true }
        });
      }
      if (faltaLaTabla(error)) {
        return null;
      }
      throw error;
    }
  },

  // La migracion crea la fila; upsert por si una base restaurada o armada a mano no la tiene.
  // null si la tabla no existe.
  async guardar(data: ActualizarConfiguracionInput) {
    try {
      return await prisma.configuracion.upsert({
        where: { idConfiguracion: ID_CONFIGURACION },
        create: { idConfiguracion: ID_CONFIGURACION, ...data },
        update: data
      });
    } catch (error) {
      if (faltaLaTabla(error) || faltaUnaColumna(error)) {
        return null;
      }
      throw error;
    }
  }
};
