import { prisma } from "../../lib/prisma";

import { usuariosRepository } from "../usuarios/usuarios.repository";

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
  }
};
