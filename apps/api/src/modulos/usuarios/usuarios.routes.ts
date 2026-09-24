import { Router } from "express";

import { asyncHandler } from "../../compartido/http/async-handler";
import { requerirAdministrador } from "../../compartido/middlewares/requerir-administrador.middleware";

import { usuariosController } from "./usuarios.controller";

export const usuariosRouter = Router();

// Cualquier usuario autenticado puede cambiar su propia clave (el service valida que sea la suya).
usuariosRouter.patch("/:id/clave", asyncHandler(usuariosController.cambiarClave));

// El resto de la gestion de usuarios es solo para administradores. El alta (POST /api/usuarios)
// se registra aparte en routes/index.ts porque admite el alta inicial sin sesion.
usuariosRouter.get("/", requerirAdministrador, asyncHandler(usuariosController.listar));
usuariosRouter.get("/:id", requerirAdministrador, asyncHandler(usuariosController.obtenerPorId));
usuariosRouter.patch("/:id", requerirAdministrador, asyncHandler(usuariosController.actualizar));
usuariosRouter.patch("/:id/estado", requerirAdministrador, asyncHandler(usuariosController.cambiarEstado));
usuariosRouter.patch(
  "/:id/restablecer-clave",
  requerirAdministrador,
  asyncHandler(usuariosController.restablecerClave)
);
// Cerrar sesion en todos los dispositivos de un usuario.
usuariosRouter.post("/:id/cerrar-sesiones", requerirAdministrador, asyncHandler(usuariosController.cerrarSesiones));
