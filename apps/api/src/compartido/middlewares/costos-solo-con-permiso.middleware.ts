import { NextFunction, Request, Response } from "express";

import { puedeVerCostos } from "../dominio/permisos";
import { ErrorProhibido } from "../errores/error-prohibido";

// Claves con costos que no salen de la API para quien no puede verlos (ver puedeVerCostos).
const CLAVES_DE_COSTO = new Set(["costo", "costoUnitario"]);

// Copia sin las claves de costo, a cualquier profundidad (items incluidos en pedidos, ordenes,
// recetas...). Solo recorre objetos planos y arrays: es lo que queda despues de serializar.
export function quitarCostos(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(quitarCostos);
  }

  if (valor !== null && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([clave]) => !CLAVES_DE_COSTO.has(clave))
        .map(([clave, contenido]) => [clave, quitarCostos(contenido)])
    );
  }

  return valor;
}

// Para toda respuesta de las rutas privadas: sin permiso, se quitan los costos antes de enviar.
// Es la red de seguridad; asi un endpoint nuevo que incluya items no los filtra por olvido.
export function ocultarCostosSinPermiso(request: Request, response: Response, next: NextFunction) {
  if (!puedeVerCostos(request.usuarioAutenticado)) {
    const enviar = response.json.bind(response);
    response.json = (cuerpo: unknown) => enviar(quitarCostos(cuerpo));
  }

  next();
}

// En altas y ediciones de items: solo quien puede ver costos puede cargarlos.
export function rechazarCostoSinPermiso(request: Request, _response: Response, next: NextFunction) {
  const cuerpo = request.body as Record<string, unknown> | undefined;

  if (cuerpo && "costo" in cuerpo && !puedeVerCostos(request.usuarioAutenticado)) {
    next(new ErrorProhibido("Solo un administrador puede cargar o cambiar el costo"));
    return;
  }

  next();
}
