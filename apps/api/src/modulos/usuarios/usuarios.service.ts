import bcrypt from "bcryptjs";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";

import { usuariosRepository } from "./usuarios.repository";

export const usuariosService = {
  listar(filtros: { activo?: boolean; limit: number; offset: number }) {
    return usuariosRepository.listar(filtros);
  },

  async obtenerPorId(idUsuario: bigint) {
    const usuario = await usuariosRepository.obtenerPorId(prisma, idUsuario);

    if (!usuario) {
      throw new ErrorNoEncontrado("Usuario no encontrado");
    }

    return usuario;
  },

  async crear(
    data: {
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      password: string;
      activo?: boolean;
    },
    usuarioSolicitante?: { idUsuario: bigint }
  ) {
    return prisma.$transaction(async (tx) => {
      const cantidadUsuarios = await usuariosRepository.contarUsuarios(tx);

      const duplicado = await usuariosRepository.buscarPorEmailOUsuario(tx, {
        email: data.email,
        usuario: data.usuario
      });

      if (duplicado) {
        throw new ErrorConflicto("Ya existe un usuario con ese email o nombre de usuario");
      }

      if (cantidadUsuarios > 0 && !usuarioSolicitante) {
        throw new ErrorAutenticacion("Debe autenticarse para crear nuevos usuarios");
      }

      const claveHash = await bcrypt.hash(data.password, 10);

      return usuariosRepository.crear(tx, {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        usuario: data.usuario,
        claveHash,
        activo: data.activo
      });
    });
  },

  async actualizar(
    idUsuario: bigint,
    data: Partial<{
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      activo: boolean;
    }>
  ) {
    await this.obtenerPorId(idUsuario);

    const duplicado = await usuariosRepository.buscarPorEmailOUsuario(prisma, {
      email: data.email,
      usuario: data.usuario,
      excluirIdUsuario: idUsuario
    });

    if (duplicado) {
      throw new ErrorConflicto("Ya existe un usuario con ese email o nombre de usuario");
    }

    return usuariosRepository.actualizar(prisma, idUsuario, data);
  },

  async cambiarEstado(idUsuario: bigint, activo: boolean) {
    await this.obtenerPorId(idUsuario);
    return usuariosRepository.actualizar(prisma, idUsuario, { activo });
  },

  async cambiarClave(
    idUsuario: bigint,
    data: { passwordActual?: string; passwordNueva: string },
    usuarioSolicitante: { idUsuario: bigint }
  ) {
    if (usuarioSolicitante.idUsuario !== idUsuario) {
      throw new ErrorAutenticacion(
        "Solo puede cambiar la contraseña del usuario autenticado"
      );
    }

    const usuario = await usuariosRepository.obtenerPorIdConClave(prisma, idUsuario);

    if (!usuario) {
      throw new ErrorNoEncontrado("Usuario no encontrado");
    }

    if (!data.passwordActual) {
      throw new ErrorAutenticacion("Debe informar la clave actual para cambiar la contraseña");
    }

    const passwordValida = await bcrypt.compare(data.passwordActual, usuario.claveHash);

    if (!passwordValida) {
      throw new ErrorAutenticacion("La clave actual es incorrecta");
    }

    const claveHash = await bcrypt.hash(data.passwordNueva, 10);

    return usuariosRepository.actualizar(prisma, idUsuario, { claveHash });
  }
};
