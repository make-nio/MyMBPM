# MLM BPM

Base de trabajo para `MLM_BPM`, un sistema de gestion para catalogo, clientes, pedidos, stock y produccion, montado como monorepo con `npm workspaces`.

## Estructura

```text
MyFirstProject/
  apps/
    web/   Next.js + React + TypeScript (export estatico)
    api/   Node.js + Express + TypeScript + Prisma (Netlify Function en produccion)
  netlify.toml
  package.json
  README.md
```

## Decisiones

- El backend existente fue reutilizado y movido a `apps/api`.
- El frontend vive en `apps/web` con Next.js App Router.
- La raiz del repositorio solo orquesta scripts, workspaces y documentacion.
- La estructura queda preparada para agregar mas apps o paquetes despues.
- La base de datos es PostgreSQL (Netlify DB / Neon) con Prisma en `apps/api`.
- Todo se despliega en un solo sitio de Netlify: la web como sitio estatico y la API Express como Netlify Function bajo `/api/*`. Detalle en [docs/despliegue-netlify.md](docs/despliegue-netlify.md).
- El backend sigue convenciones del dominio: rutas y modulos en espanol.

## Estado actual

Hoy el foco esta en `apps/api`.

Documentacion de arquitectura backend:

- [docs/arquitectura-backend.md](docs/arquitectura-backend.md)
- [docs/despliegue-netlify.md](docs/despliegue-netlify.md)

Backend implementado hasta ahora:

- infraestructura compartida de errores, validacion y rutas
- modulos base: categorias, items-catalogo y clientes
- nucleo critico: stock, pedidos y produccion
- usuarios, autenticacion y solicitudes especiales

Pendiente para la siguiente etapa:

- frontend funcional sobre `apps/web`

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL local (o una rama de Neon) para desarrollo

## Instalacion

```bash
npm install
```

`npm install` corre `prisma generate` en `apps/api` (postinstall).

Configurar `apps/api/.env` a partir de `apps/api/.env.example` y aplicar migraciones:

```bash
npm run prisma:migrate:deploy --workspace @myfirstproject/api
```

## Desarrollo

Frontend:

```bash
npm run dev:web
```

Backend:

```bash
npm run dev:api
```

Ambos desde la raiz:

```bash
npm run dev
```

La web en `http://localhost:3000` reenvia `/api/*` a la API local (`API_DEV_URL`, default `http://localhost:3002`), asi que en desarrollo tambien es mismo origen y no hace falta CORS.

## Build, checks y tests

```bash
npm run build
npm run check
npm test
```

`npm test` corre vitest sobre los services de stock, pedidos y produccion (`apps/api/src/**/*.test.ts`), con repositories y Prisma mockeados: no necesita base.

## Testing HTTP desde VSCode

- instala la extension `REST Client`
- abri [docs/http/api.http](docs/http/api.http)
- el archivo apunta por defecto a `http://localhost:3002`, que es el puerto de la API Express
- tambien funciona contra `http://localhost:3000` (rewrite de `next dev`) o contra la URL del sitio en Netlify
- si cambias `PORT` en `apps/api/.env`, actualiza `@baseUrl` en `docs/http/api.http`
- ejecuta cada request con `Send Request`
- primero corre el login para capturar el token automaticamente o completa `@token` manualmente

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NETLIFY_DATABASE_URL` | si | conexion PostgreSQL (pooled) de la API. En Netlify la inyecta Netlify DB |
| `NETLIFY_DATABASE_URL_UNPOOLED` | si, para migrar | conexion directa para Prisma Migrate. En Netlify la inyecta Netlify DB; en local puede ser igual a la anterior |
| `JWT_SECRET` | si | secreto de firma de los JWT |
| `JWT_EXPIRES_IN` | no (`8h`) | expiracion de los JWT |
| `PORT` | no (`3002`) | solo servidor local de la API |
| `API_DEV_URL` | no (`http://localhost:3002`) | solo `next dev`: destino del rewrite `/api/*` |

Ejemplos: `apps/api/.env.example`, `apps/web/.env.example`. Detalle de scopes en Netlify en [docs/despliegue-netlify.md](docs/despliegue-netlify.md).

## Prisma

El esquema esta en `apps/api/prisma/schema.prisma` (`provider = "postgresql"`).

La API usa `NETLIFY_DATABASE_URL`; Prisma Migrate usa `NETLIFY_DATABASE_URL_UNPOOLED` (`directUrl`). `prisma migrate dev` crea su shadow database temporal, asi que el usuario local necesita permiso `CREATEDB`.

```bash
npm run prisma:format --workspace @myfirstproject/api
npm run prisma:validate --workspace @myfirstproject/api
npm run prisma:generate --workspace @myfirstproject/api
npm run prisma:migrate --workspace @myfirstproject/api
```

Si queres inspeccionar una base existente antes de modelarla:

```bash
npm run prisma:db:pull --workspace @myfirstproject/api
```

Para aplicar cambios code-first desde el schema hacia la base:

```bash
npm run prisma:db:push --workspace @myfirstproject/api
```

Para generar migraciones versionadas:

```bash
npm run prisma:migrate --workspace @myfirstproject/api -- --name <nombre>
```

## Backend actual

### Modulos disponibles

- `/api/categorias`
- `/api/items-catalogo`
- `/api/clientes`
- `/api/autenticacion`
- `/api/usuarios`
- `/api/stock`
- `/api/pedidos`
- `/api/produccion`
- `/api/solicitudes-especiales`

### Reglas importantes ya implementadas

- `ESTADO_STOCK` es la unica fuente de verdad para stock.
- Toda escritura de stock pasa por `apps/api/src/modulos/stock/stock.service.ts`.
- `confirmar pedido`, `iniciar produccion` y `finalizar produccion` corren con `prisma.$transaction(...)`.
- La validacion de stock se hace dentro de la misma transaccion donde se registra el egreso.
- Los ajustes manuales solo aceptan `AJUSTE_POSITIVO` y `AJUSTE_NEGATIVO`.

### Politica actual de idempotencia

- La idempotencia de stock se resuelve primero como regla logica en `stock.service.ts`.
- La clave logica usada es:
  - `ORIGEN_MOVIMIENTO`
  - `ID_REFERENCIA_ORIGEN`
  - `ID_REFERENCIA_DETALLE`
  - `ID_ITEM_CATALOGO`
  - `TIPO_MOVIMIENTO`
- El schema y la migracion agregan un indice para apoyar estas consultas:
  - `IX_ESTADO_STOCK_IDEMPOTENCIA`
- Importante: ese indice no es `UNIQUE`, asi que hoy no bloquea duplicados concurrentes a nivel base.
- En esta etapa, la proteccion real sigue siendo logica de servicio; ante concurrencia fuerte todavia existe riesgo de duplicado.

## Notas PostgreSQL

- Las migraciones versionadas viven en `apps/api/prisma/migrations`. Hay una sola inicial para Postgres; las de SQL Server se descartaron (no hay migracion de datos).
- El deploy en Netlify corre `prisma migrate deploy` en cada build.
- Diferencias de comportamiento respecto de SQL Server (mayusculas en login/busquedas, tipos): ver [docs/despliegue-netlify.md](docs/despliegue-netlify.md).

## Despliegue

```bash
npm run build:netlify
```

Es el comando de build de `netlify.toml`: genera Prisma, migra y exporta la web a `apps/web/out`. La function se empaqueta desde `apps/api/netlify/functions`.
