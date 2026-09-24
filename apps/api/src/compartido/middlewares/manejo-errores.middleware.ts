import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errores/error-aplicacion";

type CuerpoError = { codigo: string; message: string; detalles?: unknown };

function responderError(request: Request, response: Response, status: number, error: CuerpoError) {
  response.status(status).json({ ok: false, error: { ...error, referencia: request.referencia ?? null } });
}

// Un error inesperado queda en el log de la function en una linea JSON, con la referencia que
// ve la persona en pantalla: buscando la referencia en el log de Netlify se encuentra el error.
export function registrarErrorInterno(request: Request, error: unknown) {
  const idNetlify = request.headers["x-nf-request-id"];

  console.error(
    JSON.stringify({
      nivel: "error",
      referencia: request.referencia ?? null,
      idNetlify: typeof idNetlify === "string" ? idNetlify : null,
      metodo: request.method,
      // Sin la query: puede llevar busquedas con datos de clientes.
      ruta: request.originalUrl?.split("?")[0] ?? request.url,
      idUsuario: request.usuarioAutenticado?.idUsuario?.toString() ?? null,
      error: error instanceof Error ? { nombre: error.name, mensaje: error.message, pila: error.stack } : String(error)
    })
  );
}

export function manejoErroresMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ErrorAplicacion) {
    responderError(request, response, error.statusCode, {
      codigo: error.codigo,
      message: error.message,
      detalles: error.detalles ?? null
    });
    return;
  }

  // Un cuerpo que no es JSON lo rechaza express.json(): es un error de quien llama, no un 500.
  if (typeof error === "object" && error !== null && (error as { type?: string }).type === "entity.parse.failed") {
    responderError(request, response, 400, { codigo: "VALIDACION", message: "El cuerpo de la solicitud no es un JSON valido" });
    return;
  }

  if (typeof error === "object" && error !== null && (error as { type?: string }).type === "entity.too.large") {
    responderError(request, response, 413, { codigo: "VALIDACION", message: "La solicitud es demasiado grande" });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      responderError(request, response, 409, {
        codigo: "CONFLICTO",
        message: "Ya existe un registro con un valor unico duplicado",
        detalles: error.meta ?? null
      });
      return;
    }

    if (error.code === "P2003") {
      responderError(request, response, 409, {
        codigo: "CONFLICTO",
        message: "La operacion viola una relacion existente",
        detalles: error.meta ?? null
      });
      return;
    }

    if (error.code === "P2025") {
      responderError(request, response, 404, { codigo: "NO_ENCONTRADO", message: "Registro no encontrado" });
      return;
    }
  }

  registrarErrorInterno(request, error);

  if (error instanceof Prisma.PrismaClientInitializationError) {
    responderError(request, response, 500, {
      codigo: "BASE_DATOS_NO_DISPONIBLE",
      message: "No fue posible conectarse a la base de datos"
    });
    return;
  }

  responderError(request, response, 500, { codigo: "ERROR_INTERNO", message: "Ocurrio un error interno" });
}
