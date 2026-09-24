import { OpenApiGeneratorV31, OpenAPIRegistry, RouteConfig } from "@asteasolutions/zod-to-openapi";

import { Endpoint, errorSchema, objeto, z } from "./base";
import { endpoints } from "./endpoints";

// Arma el documento OpenAPI 3.1 desde el contrato. docs/openapi.json es su salida
// (npm run contrato:generar); una prueba falla si quedo desactualizado.
export function generarOpenApi(lista: Endpoint[] = endpoints) {
  const registro = new OpenAPIRegistry();
  const bearer = registro.registerComponent("securitySchemes", "bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT"
  });
  const error = registro.register("Error", errorSchema);

  for (const endpoint of lista) {
    const exito = endpoint.sinEnvoltorio ? endpoint.respuesta : objeto({ ok: z.literal(true), data: endpoint.respuesta });
    const ruta: RouteConfig = {
      method: endpoint.metodo,
      path: endpoint.ruta,
      summary: endpoint.resumen,
      tags: [endpoint.etiqueta],
      security: endpoint.publico ? [] : [{ [bearer.name]: [] }],
      request: {
        params: endpoint.params,
        query: endpoint.query,
        body: endpoint.body ? { content: { "application/json": { schema: endpoint.body } } } : undefined
      },
      responses: {
        [endpoint.status ?? 200]: { description: "Exito", content: { "application/json": { schema: exito } } },
        default: { description: "Error", content: { "application/json": { schema: error } } }
      }
    };
    registro.registerPath(ruta);
  }

  const documento = new OpenApiGeneratorV31(registro.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "MyM BPM API",
      version: "1.0.0",
      description:
        "Contrato de la API de MyM BPM. Generado desde apps/api/src/contrato (npm run contrato:generar); no se edita a mano."
    },
    servers: [{ url: "/" }]
  });

  // zod-to-openapi escribe mal el patron de z.coerce.bigint (idSchema de los schemas de entrada):
  // "^d+$" en lugar de "^\\d+$".
  return JSON.parse(JSON.stringify(documento).replaceAll('"pattern":"^d+$"', '"pattern":"^\\\\d+$"')) as typeof documento;
}
