import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { getEnv } from "../../config/env";

import { autenticacionRepository } from "./autenticacion.repository";

type PayloadToken = {
  sub: string;
};

export const autenticacionService = {
  async login(data: { identificador: string; password: string }) {
    const usuario = await autenticacionRepository.obtenerUsuarioParaLogin(data.identificador);

    if (!usuario) {
      throw new ErrorAutenticacion("Credenciales invalidas");
    }

    if (!usuario.activo) {
      throw new ErrorAutenticacion("El usuario se encuentra inactivo");
    }

    const passwordValida = await bcrypt.compare(data.password, usuario.claveHash);

    if (!passwordValida) {
      throw new ErrorAutenticacion("Credenciales invalidas");
    }

    const env = getEnv();
    const payload: PayloadToken = {
      sub: usuario.idUsuario.toString()
    };
    const signOptions: SignOptions = {
      expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
    };

    const token = jwt.sign(payload, env.jwtSecret, signOptions);

    const usuarioSanitizado = await autenticacionRepository.obtenerUsuarioSanitizadoPorId(usuario.idUsuario);

    if (!usuarioSanitizado) {
      throw new ErrorAutenticacion("No se pudo recuperar el usuario autenticado");
    }

    return {
      token,
      usuario: usuarioSanitizado
    };
  },

  async obtenerUsuarioActual(idUsuario: bigint) {
    const usuario = await autenticacionRepository.obtenerUsuarioSanitizadoPorId(idUsuario);

    if (!usuario || !usuario.activo) {
      throw new ErrorAutenticacion("Usuario invalido o inactivo");
    }

    return usuario;
  }
};
