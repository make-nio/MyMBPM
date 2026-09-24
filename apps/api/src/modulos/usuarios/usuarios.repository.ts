import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Clave arbitraria y fija del advisory lock que serializa las altas de usuario.
const CLAVE_BLOQUEO_ALTA_USUARIOS = 4_101_001;

const usuarioSelectSanitizado = {
  idUsuario: true,
  nombre: true,
  apellido: true,
  email: true,
  usuario: true,
  activo: true,
  esAdministrador: true,
  fechaAlta: true,
  fechaModificacion: true
} satisfies Prisma.UsuarioSelect;

export const usuariosRepository = {
  usuarioSelectSanitizado,

  listar(filtros: { activo?: boolean; limit: number; offset: number }) {
    return prisma.usuario.findMany({
      where: {
        activo: filtros.activo
      },
      select: usuarioSelectSanitizado,
      orderBy: {
        idUsuario: "desc"
      },
      skip: filtros.offset,
      take: filtros.limit
    });
  },

  obtenerPorId(prismaOrTx: PrismaOrTx, idUsuario: bigint) {
    return prismaOrTx.usuario.findUnique({
      where: { idUsuario },
      select: usuarioSelectSanitizado
    });
  },

  obtenerPorIdConClave(prismaOrTx: PrismaOrTx, idUsuario: bigint) {
    return prismaOrTx.usuario.findUnique({
      where: { idUsuario }
    });
  },

  // Serializa las altas de usuario hasta el fin de la transaccion. Sin esto, dos altas
  // concurrentes con la tabla vacia verian 0 usuarios y entrarian las dos sin sesion.
  async bloquearAltaUsuarios(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_ALTA_USUARIOS})`;
  },

  contarUsuarios(prismaOrTx: PrismaOrTx) {
    return prismaOrTx.usuario.count();
  },

  buscarPorEmailOUsuario(prismaOrTx: PrismaOrTx, input: { email?: string; usuario?: string; excluirIdUsuario?: bigint }) {
    const condiciones: Prisma.UsuarioWhereInput[] = [];

    if (input.email) {
      condiciones.push({ email: { equals: input.email, mode: "insensitive" } });
    }

    if (input.usuario) {
      condiciones.push({ usuario: { equals: input.usuario, mode: "insensitive" } });
    }

    if (condiciones.length === 0) {
      return Promise.resolve(null);
    }

    return prismaOrTx.usuario.findFirst({
      where: {
        OR: condiciones,
        NOT: input.excluirIdUsuario ? { idUsuario: input.excluirIdUsuario } : undefined
      }
    });
  },

  crear(
    prismaOrTx: PrismaOrTx,
    data: {
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      claveHash: string;
      activo?: boolean;
      esAdministrador?: boolean;
    }
  ) {
    return prismaOrTx.usuario.create({
      data: {
        ...data,
        activo: data.activo ?? true
      },
      select: usuarioSelectSanitizado
    });
  },

  actualizar(
    prismaOrTx: PrismaOrTx,
    idUsuario: bigint,
    data: Partial<{
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      claveHash: string;
      activo: boolean;
    }>
  ) {
    return prismaOrTx.usuario.update({
      where: { idUsuario },
      data,
      select: usuarioSelectSanitizado
    });
  }
};
