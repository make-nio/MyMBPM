# Contrato de la API

Qué recibe y qué devuelve cada endpoint de `/api/*`. Es la fuente de verdad de las respuestas:
si una respuesta real no lo cumple, fallan las pruebas.

- **Código:** `apps/api/src/contrato/`: `base.ts` (tipos serializados y helpers) y un archivo por
  módulo en `modulos/` con sus endpoints.
- **Documento OpenAPI 3.1:** [`docs/openapi.json`](openapi.json). Se genera desde el código con
  `npm run contrato:generar --workspace @myfirstproject/api` y no se edita a mano. Se puede abrir
  con cualquier visor de OpenAPI (Swagger Editor, Redocly, la extensión de VS Code).

## Cómo se comprueba

| Prueba | Qué falla |
|---|---|
| `contrato.test.ts` (vitest, sin base) | Una ruta de Express que no está en el contrato, una del contrato que ya no existe, o `docs/openapi.json` desactualizado. |
| E2E (`e2e/fixtures.ts` y `e2e/api.ts`) | Cualquier respuesta de `/api/*` que reciba la página o que pida `e2e/api.ts` al preparar datos y no cumpla el contrato: un campo de más o de menos, un tipo distinto o un status que no es el esperado. Los errores se validan contra el formato común `{ ok: false, error: { codigo, message, detalles?, referencia } }`. |

Los objetos son estrictos: un campo nuevo en una respuesta rompe el contrato hasta que se suma
ahí. Así, por ejemplo, un `claveHash` que se filtre en un usuario hace fallar el E2E.

## La web usa el contrato

- **Tipos:** los de `apps/web/src/types/` que describen lo que devuelve o recibe la API son alias
  del contrato (`RespuestaDe<"get /api/clientes/{id}">`, `CuerpoDe<"post /api/clientes">`), que
  la web importa solo como tipos desde `@contrato` (alias de `apps/api/src/contrato/tipos.ts` en
  el `tsconfig` de la web). No suman JS al bundle.
- **Llamadas:** `src/lib/modulos/*` pide cada endpoint con `pedirApi("get /api/clientes/{id}",
  { params: { id } })`. El método y la ruta salen de la clave del contrato, y el compilador
  controla los parámetros de ruta, el cuerpo y el tipo de la respuesta.
- **Listas de valores** (estados, tipos, orígenes) que la web necesita para selects y filtros:
  tienen un chequeo de compilación (`ListaCompleta`) que falla si no coinciden exactamente con
  los enums del contrato.

Si cambia una respuesta en el contrato, la web deja de compilar donde usaba lo que cambió.

## Cómo se serializa

`compartido/http/respuesta.ts` pasa los datos por JSON:

| En Prisma | En la respuesta | En el contrato |
|---|---|---|
| `BigInt` (ids) | string de dígitos | `id` |
| `Decimal` (montos, cantidades) | string (`"1500.50"`) | `decimal` |
| `DateTime` | ISO 8601 | `fecha` |
| campo opcional (`?`) | `null` | `.nullable()` |

Los campos de costo (`costo`, `costoUnitario`) van `.optional()`: el middleware
`costos-solo-con-permiso` los borra para quien no es administrador.

## Al cambiar un endpoint

1. Cambiá la respuesta en `apps/api/src/contrato/modulos/<modulo>.ts`. Para uno nuevo, sumalo
   ahí: la prueba de rutas avisa si falta.
2. Corré `npm run contrato:generar --workspace @myfirstproject/api` y commiteá `docs/openapi.json`.
3. `npm run check`: si la web usaba algo que cambió, no compila y marca dónde.

## Límites conocidos

- Los estados (`estadoPedido`, `tipoStock` y demás) se validan contra los enums de dominio. En la
  base son texto libre: un valor viejo fuera del enum haría fallar la validación, pero solo en
  los E2E, que corren contra un Postgres local.
- Un `Decimal` muy chico o muy grande se serializa en notación exponencial (`1e-7`) y no pasaría
  `decimal`. Con las escalas de la base (2 y 3 decimales) no ocurre.
- Algunas reglas de entrada (por ejemplo "al menos un campo" o "desde no puede ser posterior a
  hasta") están en `.refine` y no se ven en el OpenAPI. La API las sigue aplicando.
