import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z, ZodTypeAny } from "zod";

// El contrato de la API: que recibe y que devuelve cada endpoint. Es la fuente de verdad de las
// respuestas; docs/openapi.json se genera desde aca (npm run contrato:generar) y los E2E validan
// contra esto cada respuesta real (e2e/fixtures.ts).
extendZodWithOpenApi(z);

export { z };

// Como llegan los tipos de Prisma despues de serializar (compartido/http/respuesta.ts):
// BigInt -> string de digitos, Decimal -> string, Date -> ISO 8601.
export const id = z.string().regex(/^\d+$/, "id serializado como string de digitos");
export const decimal = z.string().regex(/^-?\d+(\.\d+)?$/, "Decimal serializado como string");
export const fecha = z.string().datetime({ offset: true });

// Objetos estrictos: un campo de mas en la respuesta tambien rompe el contrato (por ejemplo,
// que se filtre claveHash).
export function objeto<T extends z.ZodRawShape>(forma: T) {
  return z.object(forma).strict();
}

export function lista<T extends ZodTypeAny>(item: T) {
  return z.array(item);
}

export type Metodo = "get" | "post" | "put" | "patch" | "delete";

export type Endpoint = {
  metodo: Metodo;
  // Con parametros al estilo OpenAPI: /api/clientes/{id}
  ruta: string;
  resumen: string;
  // Modulo de la API (agrupa en el OpenAPI).
  etiqueta: string;
  // Sin token (ingreso, health, primer usuario).
  publico?: boolean;
  params?: z.AnyZodObject;
  query?: z.AnyZodObject;
  body?: ZodTypeAny;
  // Lo que va en `data` de { ok: true, data }. Con `sinEnvoltorio`, el cuerpo entero.
  respuesta: ZodTypeAny;
  status?: number;
  sinEnvoltorio?: boolean;
};

export const errorSchema = objeto({
  ok: z.literal(false),
  error: objeto({
    codigo: z.string(),
    message: z.string(),
    detalles: z.unknown().optional(),
    referencia: z.string().nullable()
  })
});
