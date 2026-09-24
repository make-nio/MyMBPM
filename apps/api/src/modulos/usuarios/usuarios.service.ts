import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { ErrorProhibido } from "../../compartido/errores/error-prohibido";
import { ErrorValidacion } from "../../compartido/errores/error-validacion";
import { prisma } from "../../lib/prisma";

import { usuariosRepository } from "./usuarios.repository";

async function obtenerParaGestion(tx: Prisma.TransactionClient, idUsuario: bigint) {
  const usuario = await usuariosRepository.obtenerPorId(tx, idUsuario);

  if (!usuario) {
    throw new ErrorNoEncontrado("Usuario no encontrado");
  }

  return usuario;
}

// Desactivar o quitarle el rol al unico administrador activo dejaria el sistema sin nadie
// que pueda gestionar usuarios. Aplica igual desde PATCH /:id y desde PATCH /:id/estado.
async function validarQueQuedeUnAdministradorActivo(
  tx: Prisma.TransactionClient,
  usuario: { activo: boolean; esAdministrador: boolean },
  cambios: { activo?: boolean; esAdministrador?: boolean }
) {
  const eraAdministradorActivo = usuario.activo && usuario.esAdministrador;
  const sigueSiendolo = (cambios.activo ?? usuario.activo) && (cambios.esAdministrador ?? usuario.esAdministrador);

  if (!eraAdministradorActivo || sigueSiendolo) {
    return;
  }

  if ((await usuariosRepository.contarAdministradoresActivos(tx)) <= 1) {
    throw new ErrorConflicto(
      "No se puede desactivar ni quitarle el rol al unico administrador activo"
    );
  }
}

// Dice cual de los dos datos se repite. detalles.target usa los nombres de columna de un P2002,
// asi la web marca el campo igual que en cualquier otro duplicado.
function conflictoDuplicado(duplicado: { email?: string | null }, data: { email?: string }) {
  const mismoEmail = Boolean(data.email && duplicado.email && duplicado.email.toLowerCase() === data.email.toLowerCase());

  return new ErrorConflicto(
    `Ya existe un usuario con ${mismoEmail ? "ese email" : "ese nombre de usuario"}: usa otro y volve a guardar`,
    { target: [mismoEmail ? "EMAIL" : "USUARIO"] }
  );
}

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

  // Rechaza el alta antes de validar el cuerpo: sin permiso responde 401/403 y no deja sondear la
  // validacion. crear() lo vuelve a comprobar dentro de la transaccion (altas concurrentes).
  async verificarPermisoAlta(usuarioSolicitante?: { idUsuario: bigint; esAdministrador: boolean }) {
    if (usuarioSolicitante?.esAdministrador) {
      return;
    }

    if ((await usuariosRepository.contarUsuarios(prisma)) === 0) {
      return;
    }

    if (!usuarioSolicitante) {
      throw new ErrorAutenticacion("Debe autenticarse para crear nuevos usuarios");
    }

    throw new ErrorProhibido("Solo un administrador puede crear usuarios");
  },

  async crear(
    data: {
      nombre: string;
      apellido: string;
      email: string;
      usuario: string;
      password: string;
      activo?: boolean;
      esAdministrador?: boolean;
    },
    usuarioSolicitante?: { idUsuario: bigint; esAdministrador: boolean }
  ) {
    return prisma.$transaction(async (tx) => {
      await usuariosRepository.bloquearGestionUsuarios(tx);

      // Sin usuarios, el alta es publica: es el bootstrap del primer administrador.
      // Desde ahi, solo un administrador autenticado puede crear usuarios.
      const esAltaInicial = (await usuariosRepository.contarUsuarios(tx)) === 0;

      if (!esAltaInicial && !usuarioSolicitante) {
        throw new ErrorAutenticacion("Debe autenticarse para crear nuevos usuarios");
      }

      if (!esAltaInicial && !usuarioSolicitante?.esAdministrador) {
        throw new ErrorProhibido("Solo un administrador puede crear usuarios");
      }

      const duplicado = await usuariosRepository.buscarPorEmailOUsuario(tx, {
        email: data.email,
        usuario: data.usuario
      });

      if (duplicado) {
        throw conflictoDuplicado(duplicado, data);
      }

      const claveHash = await bcrypt.hash(data.password, 10);

      return usuariosRepository.crear(tx, {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        usuario: data.usuario,
        claveHash,
        activo: esAltaInicial ? true : data.activo,
        esAdministrador: esAltaInicial ? true : (data.esAdministrador ?? false)
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
      esAdministrador: boolean;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      await usuariosRepository.bloquearGestionUsuarios(tx);

      const usuario = await obtenerParaGestion(tx, idUsuario);
      await validarQueQuedeUnAdministradorActivo(tx, usuario, data);

      const duplicado = await usuariosRepository.buscarPorEmailOUsuario(tx, {
        email: data.email,
        usuario: data.usuario,
        excluirIdUsuario: idUsuario
      });

      if (duplicado) {
        throw conflictoDuplicado(duplicado, data);
      }

      return usuariosRepository.actualizar(tx, idUsuario, data);
    });
  },

  async cambiarEstado(idUsuario: bigint, activo: boolean) {
    return prisma.$transaction(async (tx) => {
      // Mismo bloqueo que el alta: serializa los cambios que afectan a los administradores.
      await usuariosRepository.bloquearGestionUsuarios(tx);

      const usuario = await obtenerParaGestion(tx, idUsuario);
      await validarQueQuedeUnAdministradorActivo(tx, usuario, { activo });

      return usuariosRepository.actualizar(tx, idUsuario, { activo });
    });
  },

  // Un administrador le asigna una clave nueva a otro usuario (por ejemplo, si la olvido).
  // No pide la clave actual: la ruta exige rol de administrador.
  async restablecerClave(idUsuario: bigint, passwordNueva: string) {
    await this.obtenerPorId(idUsuario);

    const claveHash = await bcrypt.hash(passwordNueva, 10);

    return usuariosRepository.actualizar(prisma, idUsuario, { claveHash });
  },

  async cambiarClave(
    idUsuario: bigint,
    data: { passwordActual?: string; passwordNueva: string },
    usuarioSolicitante: { idUsuario: bigint }
  ) {
    // 403 y no 401: la sesion es valida, lo que no puede es tocar la clave de otro usuario (para eso
    // un administrador usa "Restablecer clave").
    if (usuarioSolicitante.idUsuario !== idUsuario) {
      throw new ErrorProhibido("Solo podes cambiar tu propia clave");
    }

    const usuario = await usuariosRepository.obtenerPorIdConClave(prisma, idUsuario);

    if (!usuario) {
      throw new ErrorNoEncontrado("Usuario no encontrado");
    }

    // 400 y no 401: un 401 le dice a la web que la sesion vencio y la cierra.
    if (!data.passwordActual) {
      throw new ErrorValidacion("Falta la clave actual: escribila para poder cambiarla", [
        { path: "passwordActual", message: "Falta la clave actual" }
      ]);
    }

    const passwordValida = await bcrypt.compare(data.passwordActual, usuario.claveHash);

    if (!passwordValida) {
      throw new ErrorValidacion("La clave actual no es correcta: revisala y volve a intentar", [
        { path: "passwordActual", message: "La clave actual no es correcta" }
      ]);
    }

    const claveHash = await bcrypt.hash(data.passwordNueva, 10);

    return usuariosRepository.actualizar(prisma, idUsuario, { claveHash });
  }
};
