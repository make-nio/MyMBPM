import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

import { usuariosRepository } from "../usuarios/usuarios.repository";

// P2021: la tabla no existe. Pasa en un deploy preview (usa la base de produccion y no migra)
// hasta que la migracion de INTENTO_LOGIN llega a produccion: el ingreso sigue funcionando, sin
// limite, en vez de romperse.
function faltaLaTabla(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function avisarTablaFaltante() {
  console.warn("INTENTO_LOGIN no existe (falta migrar): el limite de intentos de ingreso no se aplica");
}

export const autenticacionRepository = {
  obtenerUsuarioParaLogin(identificador: string) {
    return prisma.usuario.findFirst({
      where: {
        OR: [
          { usuario: { equals: identificador, mode: "insensitive" } },
          { email: { equals: identificador, mode: "insensitive" } }
        ]
      }
    });
  },

  obtenerUsuarioSanitizadoPorId(idUsuario: bigint) {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      select: usuariosRepository.usuarioSelectSanitizado
    });
  },

  // Fechas de los ultimos fallidos de una clave desde `desde`, de la mas nueva a la mas vieja.
  async listarFallidosRecientes(clave: string, desde: Date, limite: number) {
    try {
      const intentos = await prisma.intentoLogin.findMany({
        where: { clave, fecha: { gte: desde } },
        select: { fecha: true },
        orderBy: { fecha: "desc" },
        take: limite
      });

      return intentos.map((intento) => intento.fecha);
    } catch (error) {
      if (faltaLaTabla(error)) {
        avisarTablaFaltante();
        return [];
      }

      throw error;
    }
  },

  async registrarFallidos(claves: string[], antiguedadMaxima: Date) {
    try {
      await prisma.$transaction([
        prisma.intentoLogin.createMany({ data: claves.map((clave) => ({ clave })) }),
        prisma.intentoLogin.deleteMany({ where: { fecha: { lt: antiguedadMaxima } } })
      ]);
    } catch (error) {
      if (faltaLaTabla(error)) {
        avisarTablaFaltante();
        return;
      }

      throw error;
    }
  },

  async limpiarFallidos(claves: string[]) {
    try {
      await prisma.intentoLogin.deleteMany({ where: { clave: { in: claves } } });
    } catch (error) {
      if (faltaLaTabla(error)) {
        avisarTablaFaltante();
        return;
      }

      throw error;
    }
  }
};
