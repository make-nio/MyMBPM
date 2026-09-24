# MLM BPM

[![CI](https://github.com/make-nio/MyMBPM/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/make-nio/MyMBPM/actions/workflows/ci.yml)

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
npm test            # vitest: services de la API y logica del front (src/lib); no necesita base
npm run test:e2e    # Playwright contra la web construida + la API + un Postgres LOCAL
```

### E2E con Playwright

Los E2E corren sobre el build real: la web exportada (`apps/web/out`) servida por
`apps/web/e2e/servidor-estatico.mjs`, que reenvia `/api/*` a la API compilada (`apps/api/dist`),
igual que Netlify. Crean datos que no se pueden borrar por la API (por ejemplo, movimientos de
stock), asi que **solo corren contra un Postgres local**: la configuracion se niega a arrancar
si `E2E_DATABASE_URL` no apunta a `localhost`.

```bash
createdb mymbpm_e2e
export NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_e2e
export NETLIFY_DATABASE_URL_UNPOOLED=$NETLIFY_DATABASE_URL E2E_DATABASE_URL=$NETLIFY_DATABASE_URL
npm run build
npm run prisma:migrate:deploy --workspace @myfirstproject/api
npx playwright install chromium   # una vez, desde apps/web
npm run test:e2e
```

Con la base vacia, el setup crea el administrador de pruebas con el alta inicial.

Hay dos proyectos: `chromium` (escritorio, todos los specs menos `movil.spec.ts`) y `movil`
(Chromium a 375 x 812 con touch, solo `movil.spec.ts`: sin desborde horizontal en ninguna
pantalla, menu plegable y un pedido completo desde el celular). `npx playwright test --project movil`
corre solo el segundo.

### Presupuesto de rendimiento (Lighthouse)

`npm run test:rendimiento` (proyecto `rendimiento` de Playwright, fuera de `test:e2e`) pasa
Lighthouse con perfil movil sobre `/ingresar` (sin sesion), `/panel`, `/pedidos` y `/reportes` (con la sesion
del administrador E2E), tres veces cada una, y compara la mediana con `PRESUPUESTO` en
`apps/web/e2e/rendimiento.spec.ts`:

- puntaje de rendimiento minimo: lo medido en el CI al crearlo menos un margen de 5 puntos, porque
  el puntaje varia entre corridas;
- JavaScript descargado maximo (el cuerpo de los scripts, sin comprimir y sin encabezados): lo
  medido mas un 10 %. Es deterministico y detecta un paquete que se cuela en el bundle.

Necesita el mismo entorno que los E2E (build, base local y el setup del administrador). Los
reportes HTML quedan en `apps/web/rendimiento-report/` y en el artefacto `lighthouse` del CI, y
la tabla en el resumen del job. Si un cambio mueve estos numeros a proposito, actualiza el
presupuesto y explicalo en el PR.

### CI y cobertura

`.github/workflows/ci.yml` corre en cada PR (hacia `main` o apilado sobre otra rama) y en cada push a `main`:
`npm ci`, `check`, tests unitarios con cobertura, `build`, migraciones, E2E contra un Postgres
de servicio del job y el presupuesto de Lighthouse. Al final, `npm run coverage:report` combina la cobertura y la publica en el
resumen del job:

- Backend: vitest + la API ejecutada durante los E2E.
- Front: Playwright (V8 del navegador, mapeado a los fuentes) + vitest de `src/lib`.

El umbral es 70 % de lineas en cada area y es bloqueante en CI (`COBERTURA_ESTRICTA=1`).
Aparte, `npm run test:coverage` falla si la cobertura de lineas **solo con vitest** baja del piso
de cada workspace (`coverage.thresholds` en `vitest.config.ts`: 49 % api, 56 % web), el valor de
septiembre de 2026. Es un piso para que no retroceda; subirlo es otro trabajo.
Para verlo en local: `E2E_COVERAGE=1 npm run build && E2E_COVERAGE=1 npm run test:e2e && npm run test:coverage && npm run coverage:report`.

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
- `/api/panel/resumen` (panel de inicio: pedidos pendientes y por entregar, ordenes en proceso, stock bajo y ultimos movimientos)

### Reglas importantes ya implementadas

- `ESTADO_STOCK` es la unica fuente de verdad para stock.
- Toda escritura de stock pasa por `apps/api/src/modulos/stock/stock.service.ts`.
- `confirmar pedido`, `iniciar produccion`, `finalizar produccion` y los ajustes manuales corren con `prisma.$transaction(...)`.
- Cada ingreso o egreso toma un lock por item y tipo de stock (`pg_advisory_xact_lock`) antes de leer el stock anterior: dos operaciones concurrentes sobre el mismo item se serializan. Las operaciones con varios items los bloquean en orden de id para no provocar deadlocks.
- La validacion de stock se hace dentro de la misma transaccion donde se registra el egreso.
- Los ajustes manuales solo aceptan `AJUSTE_POSITIVO` y `AJUSTE_NEGATIVO`, exigen motivo (`observaciones`, 400 si falta o esta vacio); el usuario sale de la sesion y el origen es siempre `MANUAL`.
- Los movimientos de pedidos y produccion quedan a nombre del usuario de la sesion.
- `GET /api/stock/existencias` devuelve el stock vigente de cada item: los productos contra su stock de `PRODUCTO` y los insumos contra el de `INSUMO`.

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
- Ese indice no es `UNIQUE`. La proteccion contra duplicados concurrentes la da el lock por item: la verificacion de idempotencia y el insert quedan serializados para el mismo item y tipo de stock (ver `docs/idempotencia-stock.md`).

## Notas PostgreSQL

- Las migraciones versionadas viven en `apps/api/prisma/migrations`. Hay una sola inicial para Postgres; las de SQL Server se descartaron (no hay migracion de datos).
- Solo el deploy de produccion corre `prisma migrate deploy`; los deploy previews no migran porque usan la misma base (ver [docs/despliegue-netlify.md](docs/despliegue-netlify.md)).
- Diferencias de comportamiento respecto de SQL Server (mayusculas en login/busquedas, tipos): ver [docs/despliegue-netlify.md](docs/despliegue-netlify.md).

## Despliegue

```bash
npm run build:netlify
```

Es el comando de build de `netlify.toml`: genera Prisma, migra (solo con `CONTEXT=production`) y exporta la web a `apps/web/out`. La function se empaqueta desde `apps/api/netlify/functions`.
