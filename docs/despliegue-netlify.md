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
| Handler | `apps/api/src/netlify.ts` | `serverless-http` sobre `createApp()`; normaliza `/.netlify/functions/api/*` a `/api/*` |
| App Express | `apps/api/src/app.ts` | la misma que usa el servidor local (`server.ts`) |
| Web | `apps/web/next.config.ts` | `output: "export"` en build; en `next dev` reescribe `/api/*` a la API local |

### Build (`npm run build:netlify`)

1. `prisma generate` (tambien corre en `postinstall` de `apps/api`).
2. `prisma migrate deploy` contra `NETLIFY_DATABASE_URL_UNPOOLED`.
3. `next build` de `apps/web` → `apps/web/out`.

Netlify empaqueta la function con esbuild. `@prisma/client` queda como modulo externo
y el query engine `rhel-openssl-3.0.x` se agrega con `included_files`. Las exclusiones
de `included_files` (runtimes WASM, `typescript`, engine nativo del build) bajan el zip de
~47 MB a ~11 MB; el limite de AWS Lambda es 50 MB comprimido.

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
- **Idempotencia de stock.** Sigue siendo logica (ver `idempotencia-stock.md`). Postgres en
  `READ COMMITTED` no bloquea lecturas, asi que el riesgo de duplicado concurrente es el mismo o
  mayor que en SQL Server; ahora es viable un indice unico parcial como respaldo.

## Operacion

- **Alta de usuarios.** `POST /api/usuarios` sin token solo funciona mientras la tabla esta
  vacia: ese primer usuario queda como administrador (`ES_ADMINISTRADOR`) y activo. Desde ahi
  exige sesion (401 sin token) de un administrador (403 si no lo es). El alta toma un
  `pg_advisory_xact_lock`, asi que dos altas simultaneas con la tabla vacia no pueden crear dos
  usuarios sin sesion.
- **Crear el primer usuario apenas termina el primer deploy.** Hasta ese momento cualquiera que
  conozca la URL podria reclamar el alta inicial.
- Los demas endpoints de `/api/usuarios` (listar, editar, activar/desactivar) solo exigen sesion,
  no rol de administrador.
- Migraciones nuevas: `npm run prisma:migrate --workspace @myfirstproject/api -- --name <nombre>`
  contra una base local; el deploy las aplica solo.
- Deploy previews: `prisma migrate deploy` corre contra la base que Netlify inyecte en ese
  contexto. Verificar si Netlify DB crea una rama por preview antes de abrir PRs con migraciones
  destructivas.
