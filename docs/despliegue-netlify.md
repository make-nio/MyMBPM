# Despliegue En Netlify

MyMBPM corre entero en un solo sitio de Netlify:

```text
https://<sitio>.netlify.app/            -> apps/web/out      (Next.js, export estatico)
https://<sitio>.netlify.app/api/*       -> Netlify Function "api" (Express via serverless-http)
                                              |
                                              v
                                        Netlify DB (Neon / PostgreSQL)
```

Web y API comparten dominio, por eso no hay CORS ni `CORS_ORIGIN`.

## Piezas

| Pieza | Archivo | Detalle |
| --- | --- | --- |
| Configuracion del sitio | `netlify.toml` | build, publish, functions y rewrite `/api/*` |
| Function | `apps/api/netlify/functions/api.ts` | re-exporta el handler |
| Scheduled Function | `apps/api/netlify/functions/respaldo-diario.ts` | respaldo diario a Netlify Blobs (ver `docs/respaldos.md`) |
| Handler | `apps/api/src/netlify.ts` | `serverless-http` sobre `createApp()`; normaliza `/.netlify/functions/api/*` a `/api/*` |
| App Express | `apps/api/src/app.ts` | la misma que usa el servidor local (`server.ts`) |
| Web | `apps/web/next.config.ts` | `output: "export"` en build; en `next dev` reescribe `/api/*` a la API local |

### Build (`npm run build:netlify`)

1. `prisma generate` (tambien corre en `postinstall` de `apps/api`).
2. `node scripts/migrar-netlify.mjs`: `prisma migrate deploy` **solo si `CONTEXT=production`**
   (ver "Migraciones y deploy previews").
3. `next build` de `apps/web` → `apps/web/out`.

Netlify empaqueta la function con esbuild. Desde Prisma 7 no hay query engine nativo: la API se
conecta con el driver adapter de pg (`@prisma/adapter-pg`, bundleado) y el cliente generado
(`apps/api/node_modules/.prisma/client`) trae el compilador de consultas en WASM, solo para
PostgreSQL. `@prisma/client` queda como modulo externo y el cliente generado se agrega con
`included_files`, excluyendo lo que no se usa en runtime (el `.wasm` suelto, tipos, runtime edge,
compiladores de otros motores, source maps y los peers `prisma` y `typescript`). El zip de la
function `api` ronda 3 MB (antes, con el engine nativo, ~11 MB); el limite de Lambda es 50 MB.

Las URLs de conexion ya no van en `schema.prisma`: el CLI (generate, migrate) las toma de
`apps/api/prisma.config.ts` (la directa, `NETLIFY_DATABASE_URL_UNPOOLED`) y la API de
`src/lib/prisma.ts` (la pooled, `NETLIFY_DATABASE_URL`).

### Por que export estatico y no el runtime de Next.js

Todas las pantallas actuales son client-side (sesion en `localStorage`, sin rutas dinamicas,
sin server actions ni route handlers). El export estatico evita una segunda function
(la del runtime de Next) compitiendo por `/api/*`. Si en el futuro se necesita SSR o rutas
dinamicas sin `generateStaticParams`, hay que revisar esta decision.

## Variables De Entorno

Se configuran en Netlify: *Site configuration → Environment variables*.

| Variable | Obligatoria | Uso | Origen |
| --- | --- | --- | --- |
| `NETLIFY_DATABASE_URL` | si | conexion pooled que usa la API en runtime | la inyecta Netlify DB |
| `NETLIFY_DATABASE_URL_UNPOOLED` | si (build) | conexion directa para `prisma migrate deploy` | la inyecta Netlify DB |
| `JWT_SECRET` | si | firma de los JWT | manual, valor largo y aleatorio |
| `JWT_EXPIRES_IN` | no (default `8h`) | expiracion de los JWT (formato `jsonwebtoken`: `8h`, `1d`, ...) | manual |

`JWT_SECRET` y las variables de base deben estar disponibles en el scope *Functions*;
las de base tambien en *Builds* (migraciones).

### `NODE_ENV=production` y devDependencies

El sitio define `NODE_ENV=production` en todos los scopes, y el plan gratuito no permite
limitarla a *Functions*. Con `NODE_ENV=production`, npm omite las devDependencies y el build
falla. `next build` no encuentra `@types/react`, intenta instalarlas por su cuenta con yarn y,
de paso, reescribe `apps/web/package.json` con otras versiones. Tampoco queda `vitest`.

Por eso `netlify.toml` define `NPM_FLAGS = "--include=dev"` en `[build.environment]`. El flag
funciona igual con `npm ci` y con `npm install`. En el runtime de la function, `NODE_ENV` sigue
siendo `production`, que es lo buscado. Para reproducirlo en local:

```bash
NODE_ENV=production npm ci --include=dev && npm run build:netlify
```

### Variables sobrantes en el sitio

Estas variables existen hoy en el sitio de Netlify y el codigo no las lee. Se pueden borrar:

| Variable | Motivo |
| --- | --- |
| `CORS_ORIGIN` | ya no hay CORS: web y API comparten dominio |
| `JWT_REFRESH_SECRET` | la API no implementa refresh tokens; solo firma con `JWT_SECRET` |

Solo desarrollo local:

| Variable | Donde | Uso |
| --- | --- | --- |
| `PORT` | `apps/api/.env` | puerto de `npm run dev:api` (default `3002`) |
| `API_DEV_URL` | `apps/web/.env.local` | destino del rewrite `/api/*` de `next dev` (default `http://localhost:3002`) |

Eliminadas: `DATABASE_URL`, `SHADOW_DATABASE_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`.

## Migracion SQL Server → PostgreSQL

Las cuatro migraciones de SQL Server se reemplazaron por una sola inicial
(`apps/api/prisma/migrations/20260924000000_inicial_postgres`), generada con
`prisma migrate diff --from-empty` desde el schema. No hay migracion de datos: se asume
base nueva.

### Tipos

| SQL Server | PostgreSQL | Impacto |
| --- | --- | --- |
| `BIGINT IDENTITY(1,1)` | `BIGSERIAL` | ninguno para la app (`BigInt` en Prisma) |
| `NVARCHAR(n)` | `VARCHAR(n)` | Postgres es UTF-8; `n` sigue contando caracteres. Los limites coinciden con los schemas zod |
| `VARCHAR(n)` | `VARCHAR(n)` | en SQL Server `VARCHAR` no-Unicode podia degradar caracteres como `Ñ` (`SEÑADO`); en Postgres no |
| `DATETIME2` (precision 7) | `TIMESTAMPTZ(3)` | Prisma ya trabajaba en milisegundos; ahora el instante queda con zona explicita (UTC) |
| `DECIMAL(p,s)` | `DECIMAL(p,s)` | sin cambios |
| `BIT` | `BOOLEAN` | sin cambios |

Se elimino la tabla `Healthcheck` que creaba la migracion `20260310_init` y no estaba en el schema.

### Comportamiento que cambia

- **Mayusculas/minusculas.** La collation por defecto de SQL Server (`*_CI_AS`) compara sin
  distinguir mayusculas; Postgres si distingue. Para mantener el comportamiento:
  - login por usuario o email: `mode: "insensitive"`;
  - chequeo de email/usuario duplicado al crear o editar usuarios: `mode: "insensitive"`;
  - busqueda de clientes (`busqueda`): `mode: "insensitive"`.

  Ademas, la base garantiza la unicidad sin distinguir mayusculas con `UQ_USUARIO_EMAIL_LOWER`
  y `UQ_USUARIO_USUARIO_LOWER`, indices unicos sobre `LOWER(...)` creados con SQL crudo en la
  migracion inicial: `Admin` y `admin` no pueden convivir aunque lleguen dos altas a la vez.
  Prisma no modela indices por expresion, pero tampoco los detecta como drift, asi que
  `migrate dev` no los borra. No quitar ese bloque al tocar la migracion.
- **Unicos sobre columnas nullable.** En SQL Server un `UNIQUE` admite un solo `NULL`; en
  Postgres admite varios. Hoy no hay unicos sobre columnas nullable, pero esto destraba lo
  que `modelado-inicial-mvp.md` dejo pendiente por "friccion operativa".
- **Idempotencia de stock.** La verifica el service bajo lock y, desde
  `20260924080000_unique_idempotencia_stock`, tambien un indice unico parcial
  (`UQ_ESTADO_STOCK_IDEMPOTENCIA`, ver `idempotencia-stock.md`).

## Operacion

- **Alta de usuarios.** `POST /api/usuarios` sin token solo funciona mientras la tabla esta
  vacia: ese primer usuario queda como administrador (`ES_ADMINISTRADOR`) y activo. Desde ahi
  exige sesion (401 sin token) de un administrador (403 si no lo es). El alta toma un
  `pg_advisory_xact_lock`, asi que dos altas simultaneas con la tabla vacia no pueden crear dos
  usuarios sin sesion.
- **Crear el primer usuario apenas termina el primer deploy.** Hasta ese momento cualquiera que
  conozca la URL podria reclamar el alta inicial.
- **Gestion de usuarios.** Listar, ver, editar y activar/desactivar usuarios (`/api/usuarios`)
  exige ser administrador (middleware `requerirAdministrador`; 403 si no lo es). Cualquier usuario
  autenticado puede ver sus datos (`/api/autenticacion/me`) y cambiar su propia clave
  (`PATCH /api/usuarios/:id/clave`). Un administrador puede asignarle una clave nueva a otro
  usuario sin la anterior (`PATCH /api/usuarios/:id/restablecer-clave`) y cambiarle el rol
  (`esAdministrador` en `PATCH /api/usuarios/:id`). No se puede desactivar ni quitarle el rol al
  unico administrador activo (409), por ninguna de las dos rutas, para que el sistema no quede sin
  nadie que gestione usuarios. Los JWT ya emitidos siguen validos hasta vencer (`JWT_EXPIRES_IN`)
  aunque se restablezca la clave; desactivar al usuario si los corta, porque cada request verifica
  que siga activo.
- Migraciones nuevas: `npm run prisma:migrate --workspace @myfirstproject/api -- --name <nombre>`
  contra una base local; el deploy las aplica solo.
- Deploy previews: no migran (ver "Migraciones y deploy previews").

## Migraciones y deploy previews

En el sitio, `NETLIFY_DATABASE_URL` y `NETLIFY_DATABASE_URL_UNPOOLED` tienen el mismo valor en
todos los contextos. Un deploy preview usa la **base de produccion**. Si el build del preview
corriera `prisma migrate deploy`, cualquier PR con una migracion la aplicaria en produccion antes
de ser revisado e integrado.

Por eso `scripts/migrar-netlify.mjs` decide segun `CONTEXT`:

| `CONTEXT` | Que hace |
| --- | --- |
| `production` | `prisma migrate deploy` (falla el deploy si la migracion falla) |
| `deploy-preview`, `branch-deploy` | no migra; corre `prisma migrate status` (solo lectura) y avisa en el log si el PR trae migraciones pendientes |
| sin `CONTEXT` (local) | no migra; en local se usa `npm run prisma:migrate:deploy --workspace @myfirstproject/api` |

Consecuencia: un preview de un PR con migracion corre contra el schema actual de produccion. Lo que
dependa de la migracion nueva puede fallar en ese preview. Se prueba en local o en CI, que migran
su propia base, y la migracion se aplica al integrar en `main`.

Para que nadie lo olvide, en los deploys que no son de produccion (`CONTEXT` distinto de
`production`) la web muestra arriba de todo la franja **"Vista previa: usa la base real"**.
`next.config.ts` pasa `CONTEXT` a la web como `NEXT_PUBLIC_CONTEXTO_DESPLIEGUE` en el build; en
local, CI y E2E no hay `CONTEXT` y la franja no aparece.

Reglas para PRs con migraciones mientras sea asi:

- Solo migraciones **aditivas**: tablas nuevas, o columnas nullable o con default. Nada que borre,
  renombre o cambie tipos: el deploy de produccion aplica la migracion y el codigo nuevo casi a la
  vez, y el codigo anterior sigue sirviendo requests mientras tanto.
- Avisarlo en la descripcion del PR.
- Si el codigo nuevo lee una tabla nueva, tiene que tolerar que falte (Prisma `P2021`) para que el
  preview no se rompa. Ejemplo: `INTENTO_LOGIN` (limite de intentos de ingreso). Sin la tabla, el
  ingreso funciona sin limite y deja un aviso en el log (`autenticacion.repository.ts`).
  Si la escritura va **dentro de una transaccion**, atrapar el error no alcanza: Postgres aborta
  toda la transaccion. En ese caso hay que preguntar antes si la tabla existe (`to_regclass`),
  como hace `AUDITORIA_CAMBIO` en `auditoria.repository.ts`.

### Propuesta: rama de base por deploy preview

El producto **Netlify Database** (`@netlify/database`) crea una rama aislada de la base por deploy
preview, copiada de produccion. Pero la URL se obtiene en runtime con `getConnectionString()` y las
migraciones se aplican desde `netlify/database/migrations/` con su propio formato. Hoy usamos la
variable `NETLIFY_DATABASE_URL` y Prisma Migrate. Adoptarlo implica cambiar como la API obtiene
la conexion y como se versionan las migraciones, y conviene evaluarlo en un PR aparte. Otra
alternativa es una rama de Neon por preview creada desde el build con la API de Neon. Con
cualquiera de las dos, `scripts/migrar-netlify.mjs` podria volver a migrar en previews.

## Errores en produccion: la referencia

Cada solicitud a la API lleva una **referencia** corta (`3F9A-12BC`), en el header `X-Referencia`
(`compartido/middlewares/referencia.middleware.ts`). Se llama referencia, y no "id de pedido",
para no confundirla con los pedidos de clientes.

- Ante un error inesperado (500), `manejo-errores.middleware.ts` deja **una linea JSON** en el
  log de la function con `nivel: "error"`, la `referencia`, el `idNetlify` (`x-nf-request-id`),
  el metodo, la ruta **sin la query** (puede llevar busquedas con datos de clientes), el
  `idUsuario` y el error con su pila.
- La respuesta lleva la misma `referencia`, y la web la agrega al mensaje de error de cualquier
  pantalla: "Ocurrio un error interno. Referencia del error: 3F9A-12BC ...".
- Para encontrarlo: Netlify → Logs → Functions → `api`, y buscar la referencia que paso Maxi.
- Los errores de negocio o validacion (4xx) tambien traen la referencia en la respuesta, pero no
  se registran como error ni se muestra la referencia en pantalla.

## Encabezados de seguridad

`apps/web/scripts/generar-encabezados.mjs` corre al final de `npm run build` de la web y escribe
`apps/web/out/_headers`, que Netlify aplica a todo el sitio (`/*`):

| Encabezado | Valor |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self'` + el hash sha256 de cada script inline del export de Next (sin `'unsafe-inline'`); `style-src 'self' 'unsafe-inline'` (React usa `style=""`); `img-src 'self' data:`; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (sin `preload`) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (para navegadores que no leen `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camara, microfono, geolocalizacion, pagos, USB y topics deshabilitados |
| `Cross-Origin-Opener-Policy` | `same-origin` |

- Los hashes cambian con cada build (el contenido de los scripts inline lo arma Next), por eso se
  generan en el build y no se escriben a mano. Es **una sola CSP** para todo el sitio: si dos reglas
  de Netlify dieran CSP para la misma ruta, el navegador aplicaria las dos y la pagina se bloquearia.
- `CSP_SOLO_REPORTE=1` en el build la publica como `Content-Security-Policy-Report-Only`: no bloquea,
  solo avisa en la consola. Sirve para diagnosticar si algo falla en produccion sin romper el sitio.
- La API (`/api/*`) pone ademas sus propios encabezados (`encabezados-seguridad.middleware.ts`):
  `nosniff`, `X-Frame-Options`, `Referrer-Policy` y `Cache-Control: no-store` (las respuestas tienen
  datos de clientes y costos), sin `X-Powered-By`.
- El servidor de los E2E (`e2e/servidor-estatico.mjs`) aplica el mismo `_headers`: toda la suite corre
  con la CSP de produccion, y `e2e/seguridad.spec.ts` recorre las pantallas y sus altas sin
  violaciones en la consola.
- En los deploy previews Netlify inyecta su barra de comentarios (`/.netlify/scripts/cdp`, que abre un
  iframe de `app.netlify.com`). Solo en esos builds (`CONTEXT` distinto de `production`) la CSP
  suma `frame-src https://app.netlify.com`; en produccion no se permite ningun iframe.
- Netlify reemplaza el HSTS por el suyo en `*.netlify.app` (`...; includeSubDomains; preload`).
