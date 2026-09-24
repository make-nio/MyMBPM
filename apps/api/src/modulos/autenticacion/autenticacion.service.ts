import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

import { ErrorAutenticacion } from "../../compartido/errores/error-autenticacion";
import { ErrorDemasiadosIntentos } from "../../compartido/errores/error-demasiados-intentos";
import { getEnv } from "../../config/env";

import { autenticacionRepository } from "./autenticacion.repository";
import { calcularBloqueo, LIMITE_INTENTOS, minutosRestantes, RETENCION_INTENTOS_MS } from "./limite-intentos";

type PayloadToken = {
  sub: string;
};

type ClaveLimitada = { clave: string; maximo: number };

// Rechaza el ingreso sin mirar la clave si la cuenta o la IP estan bloqueadas.
async function verificarBloqueo(claves: ClaveLimitada[], ahora: Date) {
  const desde = new Date(ahora.getTime() - LIMITE_INTENTOS.ventanaMs - LIMITE_INTENTOS.bloqueoMs);

  for (const { clave, maximo } of claves) {
    const fallidos = await autenticacionRepository.listarFallidosRecientes(clave, desde, maximo);
    const hasta = calcularBloqueo(fallidos, maximo, ahora);

    if (hasta) {
      const minutos = minutosRestantes(hasta, ahora);
      throw new ErrorDemasiadosIntentos(
        `Demasiados intentos fallidos. Proba de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
        { reintentarEnSegundos: Math.ceil((hasta.getTime() - ahora.getTime()) / 1000) }
      );
    }
  }
}

export const autenticacionService = {
  async login(data: { identificador: string; password: string }, contexto: { ip: string | null } = { ip: null }) {
    const ahora = new Date();
    const usuario = await autenticacionRepository.obtenerUsuarioParaLogin(data.identificador);

    // Por cuenta (no por lo que se escribio: usuario y email cuentan juntos) y por IP.
    const claves: ClaveLimitada[] = [
      {
        clave: usuario
          ? `usuario:${usuario.idUsuario}`
          : `identificador:${data.identificador.trim().toLowerCase()}`,
        maximo: LIMITE_INTENTOS.maximoPorUsuario
      },
      ...(contexto.ip ? [{ clave: `ip:${contexto.ip}`, maximo: LIMITE_INTENTOS.maximoPorIp }] : [])
    ];

    await verificarBloqueo(claves, ahora);

    async function rechazar(mensaje: string): Promise<never> {
      await autenticacionRepository.registrarFallidos(
        claves.map(({ clave }) => clave),
        new Date(ahora.getTime() - RETENCION_INTENTOS_MS)
      );
      throw new ErrorAutenticacion(mensaje);
    }

    if (!usuario) {
      return rechazar("Credenciales invalidas");
    }

    if (!usuario.activo) {
      return rechazar("El usuario se encuentra inactivo");
    }

    const passwordValida = await bcrypt.compare(data.password, usuario.claveHash);

    if (!passwordValida) {
      return rechazar("Credenciales invalidas");
    }

    // Un ingreso correcto reinicia la cuenta de fallidos de la cuenta y de la IP.
    await autenticacionRepository.limpiarFallidos(claves.map(({ clave }) => clave));

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
