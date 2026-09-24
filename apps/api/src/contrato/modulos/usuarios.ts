import { Endpoint, fecha, id, lista, objeto, z } from "../base";
import {
  actualizarEstadoUsuarioSchema,
  actualizarUsuarioSchema,
  cambiarClaveUsuarioSchema,
  crearUsuarioSchema,
  listarUsuariosQuerySchema,
  restablecerClaveUsuarioSchema
} from "../../modulos/usuarios/usuarios.schemas";

// El usuario sanitizado (usuariosRepository.usuarioSelectSanitizado): nunca claveHash.
export const usuario = objeto({
  idUsuario: id,
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
  usuario: z.string(),
  activo: z.boolean(),
  esAdministrador: z.boolean(),
  fechaAlta: fecha,
  fechaModificacion: fecha
}).openapi("Usuario");

const params = objeto({ id });

export const endpoints = [
  {
    metodo: "post",
    ruta: "/api/usuarios",
    acceso: "administrador",
    resumen: "Crea un usuario (sin sesion solo el primero, que queda administrador; despues, solo un administrador)",
    etiqueta: "usuarios",
    body: crearUsuarioSchema,
    respuesta: usuario,
    status: 201
  },
  {
    metodo: "patch",
    ruta: "/api/usuarios/{id}/clave",
    acceso: "autenticado",
    soloPropio: true,
    resumen: "Cambia la clave del usuario autenticado (pide la actual)",
    etiqueta: "usuarios",
    params,
    body: cambiarClaveUsuarioSchema,
    respuesta: usuario
  },
  {
    metodo: "get",
    ruta: "/api/usuarios",
    acceso: "administrador",
    resumen: "Lista los usuarios (solo administradores)",
    etiqueta: "usuarios",
    query: listarUsuariosQuerySchema,
    respuesta: lista(usuario)
  },
  {
    metodo: "get",
    ruta: "/api/usuarios/{id}",
    acceso: "administrador",
    resumen: "Obtiene un usuario (solo administradores)",
    etiqueta: "usuarios",
    params,
    respuesta: usuario
  },
  {
    metodo: "patch",
    ruta: "/api/usuarios/{id}",
    acceso: "administrador",
    resumen: "Edita los datos y el rol de un usuario (solo administradores)",
    etiqueta: "usuarios",
    params,
    body: actualizarUsuarioSchema,
    respuesta: usuario
  },
  {
    metodo: "patch",
    ruta: "/api/usuarios/{id}/estado",
    acceso: "administrador",
    resumen: "Activa o desactiva un usuario (solo administradores)",
    etiqueta: "usuarios",
    params,
    body: actualizarEstadoUsuarioSchema,
    respuesta: usuario
  },
  {
    metodo: "patch",
    ruta: "/api/usuarios/{id}/restablecer-clave",
    acceso: "administrador",
    resumen: "Asigna una clave nueva a otro usuario (solo administradores)",
    etiqueta: "usuarios",
    params,
    body: restablecerClaveUsuarioSchema,
    respuesta: usuario
  }
] as const satisfies readonly Endpoint[];
