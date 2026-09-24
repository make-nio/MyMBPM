import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errores/error-aplicacion";

type CuerpoError = { codigo: string; message: string; detalles?: unknown };

// Columnas con indice unico, tal como las nombra Prisma en meta.target de un P2002.
const NOMBRE_COLUMNA_UNICA: Record<string, string> = {
  SLUG: "slug",
  EMAIL: "email",
  USUARIO: "nombre de usuario"
};

// Con el adapter de pg (Prisma 7) un P2002 no trae meta.target sino el nombre del indice, en
// meta.driverAdapterError.cause.constraint.index. Estas son sus columnas (schema.prisma, map:).
const COLUMNAS_POR_INDICE: Record<string, string[]> = {
  UQ_CATEGORIA_SLUG: ["SLUG"],
  UQ_ITEM_CATALOGO_SLUG: ["SLUG"],
  UQ_USUARIO_EMAIL: ["EMAIL"],
  UQ_USUARIO_USUARIO: ["USUARIO"],
  UQ_USUARIO_EMAIL_LOWER: ["EMAIL"],
  UQ_USUARIO_USUARIO_LOWER: ["USUARIO"]
};

type MetaDuplicado = {
  target?: unknown;
  driverAdapterError?: { cause?: { constraint?: { index?: unknown; fields?: unknown } } };
};

// Columnas repetidas de un P2002, sea cual sea la forma de meta. [] si no se pueden saber.
export function columnasDuplicadas(meta: unknown): string[] {
  const datos = (meta ?? {}) as MetaDuplicado;
  const soloTextos = (valor: unknown) =>
    Array.isArray(valor) ? valor.filter((columna): columna is string => typeof columna === "string") : [];

  const target = soloTextos(datos.target);
  if (target.length > 0) {
    return target;
  }

  const restriccion = datos.driverAdapterError?.cause?.constraint;
  const campos = soloTextos(restriccion?.fields);
  if (campos.length > 0) {
    return campos;
  }

  return typeof restriccion?.index === "string" ? (COLUMNAS_POR_INDICE[restriccion.index] ?? []) : [];
}

// Un duplicado dice que valor se repite y como se arregla, no solo "valor unico duplicado".
export function mensajeDuplicado(meta: unknown) {
  const columnas = columnasDuplicadas(meta);
  const nombres = columnas.map((columna) => NOMBRE_COLUMNA_UNICA[columna]).filter(Boolean);

  if (nombres.length === 0 || nombres.length !== columnas.length) {
    return "Ya existe un registro con un valor unico duplicado: cambia ese dato y volve a guardar";
  }

  return `Ya existe otro registro con ese ${nombres.join(" y ")}: elegi uno distinto y volve a guardar`;
}

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
        message: mensajeDuplicado(error.meta),
        // target con las columnas siempre, para que la web marque el campo (tambien con Prisma 7).
        detalles: { ...(error.meta ?? {}), target: columnasDuplicadas(error.meta) }
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
