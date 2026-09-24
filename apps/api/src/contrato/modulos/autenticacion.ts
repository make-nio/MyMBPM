import { Endpoint, objeto, z } from "../base";
import { loginSchema } from "../../modulos/autenticacion/autenticacion.schemas";

import { usuario } from "./usuarios";

export const endpoints = [
  {
    metodo: "post",
    ruta: "/api/autenticacion/login",
    acceso: "publico",
    resumen: "Ingresa con usuario o email y clave; devuelve el token y el usuario",
    etiqueta: "autenticacion",
    body: loginSchema,
    respuesta: objeto({
      token: z.string(),
      usuario
    })
  },
  {
    metodo: "get",
    ruta: "/api/autenticacion/me",
    acceso: "autenticado",
    resumen: "Devuelve el usuario de la sesion actual",
    etiqueta: "autenticacion",
    respuesta: usuario
  }
] as const satisfies readonly Endpoint[];
