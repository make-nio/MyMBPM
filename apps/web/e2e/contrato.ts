import type { Response } from "@playwright/test";

import { validarRespuesta } from "../../api/src/contrato/validar-respuesta";

// Valida una respuesta de /api/* contra el contrato de la API. Devuelve los problemas ([] si la
// cumple). Las que no son JSON (o se cortaron al cerrar la pagina) no se revisan.
export async function revisarContrato(respuesta: Response): Promise<string[]> {
  const url = new URL(respuesta.url());

  if (!url.pathname.startsWith("/api/")) {
    return [];
  }

  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    return [];
  }

  return validarRespuesta({ metodo: respuesta.request().method(), ruta: url.pathname, status: respuesta.status(), cuerpo });
}

// Lo mismo para las respuestas que pide e2e/api.ts al preparar datos (fetch de Node).
export function revisarContratoFetch(metodo: string, url: string, status: number, cuerpo: unknown) {
  return validarRespuesta({ metodo, ruta: new URL(url).pathname, status, cuerpo });
}
