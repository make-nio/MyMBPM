import { Endpoint, errorSchema, objeto, z } from "./base";
import { endpoints } from "./endpoints";

type Respuesta = {
  metodo: string;
  // Ruta real, sin query: /api/clientes/12
  ruta: string;
  status: number;
  cuerpo: unknown;
};

function patron(ruta: string) {
  const fuente = ruta
    .split("/")
    .map((parte) => (/^\{[^}]+\}$/.test(parte) ? "[^/]+" : parte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${fuente}/?$`);
}

const indice = endpoints.map((endpoint) => ({ endpoint, patron: patron(endpoint.ruta) }));

// Rutas con parametro compiten con rutas fijas (/api/clientes/{id} y /api/clientes/importacion):
// gana la que tiene menos parametros, como en Express.
export function buscarEndpoint(metodo: string, ruta: string): Endpoint | null {
  const candidatos = indice
    .filter((entrada) => entrada.endpoint.metodo === metodo.toLowerCase() && entrada.patron.test(ruta))
    .sort((a, b) => (a.endpoint.ruta.match(/\{/g)?.length ?? 0) - (b.endpoint.ruta.match(/\{/g)?.length ?? 0));
  return candidatos[0]?.endpoint ?? null;
}

// Devuelve los problemas de una respuesta real frente al contrato, o [] si lo cumple.
export function validarRespuesta({ metodo, ruta, status, cuerpo }: Respuesta): string[] {
  const endpoint = buscarEndpoint(metodo, ruta);

  if (!endpoint) {
    return [`${metodo.toUpperCase()} ${ruta}: no esta en el contrato (apps/api/src/contrato)`];
  }

  const esperado = endpoint.status ?? 200;
  let schema: z.ZodTypeAny;

  if (status >= 400) {
    schema = endpoint.sinEnvoltorio && status === 503 ? endpoint.respuesta : errorSchema;
  } else if (status !== esperado) {
    return [`${metodo.toUpperCase()} ${endpoint.ruta}: respondio ${status} y el contrato dice ${esperado}`];
  } else {
    schema = endpoint.sinEnvoltorio ? endpoint.respuesta : objeto({ ok: z.literal(true), data: endpoint.respuesta });
  }

  const resultado = schema.safeParse(cuerpo);
  if (resultado.success) {
    return [];
  }

  return resultado.error.issues
    .slice(0, 10)
    .map((issue) => `${metodo.toUpperCase()} ${endpoint.ruta} (${status}): ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
}
