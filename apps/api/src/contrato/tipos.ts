import type { z } from "zod";

import type { endpoints } from "./endpoints";

// Tipos de lo que recibe y devuelve cada endpoint, inferidos del contrato. La web los usa solo
// como tipos (import type desde "@contrato" en apps/web/src/types): no suman JS al bundle y no
// pueden separarse de lo que la API devuelve de verdad, que los E2E validan contra este contrato.
type Mapa = { [E in (typeof endpoints)[number] as `${E["metodo"]} ${E["ruta"]}`]: E };

// "get /api/clientes/{id}"
export type ClaveEndpoint = keyof Mapa;

// Lo que llega en `data` (o el cuerpo entero, en los endpoints sin envoltorio).
export type RespuestaDe<K extends ClaveEndpoint> = z.output<Mapa[K]["respuesta"]>;

// Por JSON un id viaja como texto: z.coerce.bigint() lo acepta, pero su tipo de entrada en zod 3
// es bigint.
type ComoJson<T> = T extends bigint
  ? string
  : T extends readonly (infer U)[]
    ? ComoJson<U>[]
    : T extends object
      ? { [C in keyof T]: ComoJson<T[C]> }
      : T;

// Lo que se manda en el cuerpo, tal como lo acepta la API.
export type CuerpoDe<K extends ClaveEndpoint> = Mapa[K] extends { body: infer B extends z.ZodTypeAny }
  ? ComoJson<z.input<B>>
  : never;

// Los parametros de consulta, tal como los acepta la API.
export type ConsultaDe<K extends ClaveEndpoint> = Mapa[K] extends { query: infer Q extends z.ZodTypeAny }
  ? ComoJson<z.input<Q>>
  : never;
