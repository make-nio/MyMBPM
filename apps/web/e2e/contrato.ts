import type { Response } from "@playwright/test";

import { validarRespuesta } from "../../api/src/contrato/validar-respuesta";

const PLAZO_CUERPO_MS = 5000;

// Valida una respuesta de /api/* contra el contrato de la API. Devuelve los problemas ([] si la
// cumple). Las que no son JSON (o se cortaron al cerrar la pagina) no se revisan.
export async function revisarContrato(respuesta: Response): Promise<string[]> {
  const url = new URL(respuesta.url());

  if (!url.pathname.startsWith("/api/")) {
    return [];
  }

  // Un cuerpo que no termina de llegar (una respuesta que la pagina abandono al navegar o al
  // cerrarse) no puede colgar el cierre de la prueba: pasado el plazo se saltea, como uno sin JSON.
  let cuerpo: unknown;
  let plazo: ReturnType<typeof setTimeout> | undefined;
  try {
    cuerpo = await Promise.race([
      respuesta.json(),
      new Promise<never>((_, rechazar) => {
        plazo = setTimeout(() => rechazar(new Error("cuerpo sin terminar")), PLAZO_CUERPO_MS);
      })
    ]);
  } catch {
    return [];
  } finally {
    clearTimeout(plazo);
  }

  return validarRespuesta({ metodo: respuesta.request().method(), ruta: url.pathname, status: respuesta.status(), cuerpo });
}

// Lo mismo para las respuestas que pide e2e/api.ts al preparar datos (fetch de Node).
export function revisarContratoFetch(metodo: string, url: string, status: number, cuerpo: unknown) {
  return validarRespuesta({ metodo, ruta: new URL(url).pathname, status, cuerpo });
}
