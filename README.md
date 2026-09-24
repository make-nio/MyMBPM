# MyM BPM

[![CI](https://github.com/make-nio/MyMBPM/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/make-nio/MyMBPM/actions/workflows/ci.yml)

Sistema de gestion de **MyM**, un emprendimiento de impresion 3D: catalogo de items con su receta,
clientes, pedidos, stock, produccion y pedidos a medida ("solicitudes especiales"). Lo usan una o
pocas personas desde un panel privado con usuario y clave. Monorepo con `npm workspaces`.

## Estructura

```text
MyMBPM/
  apps/
    web/   Next.js 15 + React 19 + TypeScript (export estatico)
    api/   Node 20 + Express + TypeScript + Prisma sobre PostgreSQL (Netlify Function en produccion)
  docs/    arquitectura, despliegue, respaldos, modelo de datos, pedidos HTTP de ejemplo
  scripts/ build de Netlify, reporte de cobertura, resumenes del CI
  netlify.toml
```

## Decisiones

- La base es PostgreSQL (Netlify DB / Neon) con Prisma en `apps/api`.
- Todo se despliega en un solo sitio de Netlify: la web como sitio estatico y la API Express como
  Netlify Function bajo `/api/*`, en el mismo dominio (sin CORS). Detalle en
  [docs/despliegue-netlify.md](docs/despliegue-netlify.md).
- Rutas, modulos y codigo en espanol, como el dominio.
- La API devuelve como mucho 100 filas por pedido y no manda totales: las pantallas cargan de a 50
  ("Cargar mas") y los selectores buscan en el servidor.

## Que hace hoy

Pantallas (`apps/web/app/(privado)/`), todas usables desde el celular (375 px):

| Pantalla | Que se hace |
| --- | --- |
| Dashboard (`/panel`) | Pedidos para confirmar y para entregar, entregas atrasadas y de la semana, ordenes en proceso, stock para reponer, ultimos movimientos y, para administradores, lo vendido y ganado en el mes |
| Pedidos | Alta, items con precio y costo congelados al agregarlos, impacto en stock antes de confirmar, estados y cobro, fecha de entrega prometida, comprobante imprimible (no fiscal), repetir un pedido, exportar CSV |
| Produccion | Ordenes con sus productos, impacto en insumos antes de iniciar y en productos al finalizar; vista de lista o **tablero** por estado |
| Stock | Existencias por tipo, "Solo bajo minimo", ajustes con motivo, movimientos con su origen, crear una orden para reponer, exportar CSV |
| Items catalogo | Items con su receta, costo de la receta, historial de cambios y de precio y costo (administradores), importacion desde CSV (administradores) |
| Clientes | Alta y edicion, ficha con historial de compras y total, historial de cambios, importacion desde CSV (administradores) |
| Categorias, Solicitudes especiales | Alta, edicion y estados; una solicitud se convierte en pedido |
| Reportes (administradores) | Lo vendido en un mes por item y por cliente, grafico de 12 meses, exportar CSV |
| Usuarios (administradores) | Alta, roles, activar y desactivar, restablecer la clave |
| Ayuda (`/ayuda`) | Guia para el dia a dia y, para administradores, la guia de administracion |

En el encabezado: **busqueda global** (Ctrl+K / Cmd+K) de pedidos, clientes e items, y la
**campanita de avisos** (items bajo el minimo, entregas atrasadas o para hoy).

## Documentacion

| Documento | De que trata |
| --- | --- |
| [docs/arquitectura-backend.md](docs/arquitectura-backend.md) | Reglas del backend, forma de un modulo, mapa de modulos, middlewares, seguridad del ingreso, auditoria, costos, importaciones |
| [docs/idempotencia-stock.md](docs/idempotencia-stock.md) | Por que reintentar una operacion de stock no descuenta dos veces |
| [docs/der-actualizado.md](docs/der-actualizado.md) | Modelo de datos |
| [docs/despliegue-netlify.md](docs/despliegue-netlify.md) | Build, variables, migraciones y deploy previews, encabezados de seguridad (CSP), `/api/health` |
| [docs/respaldos.md](docs/respaldos.md) | Respaldo logico diario en Netlify Blobs: que contiene, como descargarlo y restaurarlo |
| [docs/backend-bloque-1-endpoints.md](docs/backend-bloque-1-endpoints.md), [bloque 2](docs/backend-bloque-2-endpoints.md) | Endpoints de los primeros bloques con ejemplos |
| [docs/http/api.http](docs/http/api.http) | Pedidos de ejemplo para REST Client |

Para trabajar en el repo (convenciones, comandos, reglas que no se rompen), ver `CLAUDE.md`.

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

### Datos de demostracion

Para ver la web con un negocio cargado, sobre una base **local vacia**:

```bash
createdb mymbpm_demo
cd apps/api
export NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_demo
NETLIFY_DATABASE_URL_UNPOOLED=$NETLIFY_DATABASE_URL npx prisma migrate deploy
JWT_SECRET=x npm run demo:cargar
```

`scripts/datos-demo.ts` carga los datos pasando por los services, asi que se aplican las mismas
reglas y el stock lo mueve `stock.service`:

- 12 insumos (filamentos, resina, argollas, imanes, cajas) y 18 productos, casi todos con receta,
  precio y costo;
- stock inicial, con algunos items bajo el minimo;
- 10 ordenes de produccion en todos los estados;
- 36 clientes;
- unos 70 pedidos de los ultimos 12 meses en todos los estados, con entregas atrasadas, para hoy
  y para la semana;
- 5 solicitudes especiales, una ya convertida en pedido.

Si no hay usuarios, crea el administrador `demo` (clave `demo-mym-2026`). **Se niega si la base
no es local o si ya tiene items.** Los movimientos de stock quedan con la fecha del dia en que se
cargo; los pedidos, con fechas repartidas en el anio.

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

### Prueba de humo de produccion

`.github/workflows/humo-produccion.yml` corre despues de cada push a `main`:

1. Espera (hasta 20 min) a que produccion sirva el build de ese commit: el build escribe
   `apps/web/out/version.json` con `COMMIT_REF` (`scripts/generar-version.mjs`) y
   `scripts/esperar-deploy.mjs` lo consulta. Si no aparece, falla y avisa que revisen el deploy en
   Netlify (por ejemplo, un build roto).
2. Corre `npm run test:humo` (config aparte, `apps/web/playwright.humo.config.ts`, pruebas en
   `apps/web/e2e/humo/*.humo.ts`) contra el sitio publicado: `/api/health` responde 200 con la
   base en `ok`, `/ingresar` sale con la CSP, React hidrata y no hay errores de consola, violaciones
   de CSP ni pedidos al sitio con error.

Es **solo lectura**: no inicia sesion, no escribe nada y no toca la base mas alla del health. Si
falla, el check queda en rojo sobre el commit de `main` (con trazas como artefacto). El sitio es la
variable del repositorio `URL_PRODUCCION` o, si no esta, `https://mymbpm.netlify.app`. Tambien se
puede lanzar a mano (Actions → "Humo de produccion" → Run workflow), opcionalmente contra otra URL
como un deploy preview; en local:

```bash
URL_HUMO=https://mymbpm.netlify.app npm run test:humo --workspace @myfirstproject/web
```

### E2E nocturno

`.github/workflows/e2e-nocturno.yml` corre todas las noches (06:00 UTC, 03:00 en Argentina) la suite
E2E completa (`chromium` y `movil`) **3 veces seguidas y sin reintentos** (`--repeat-each=3
--retries=0`), contra su propio Postgres de servicio. En el CI de los PR hay 1 reintento, que tapa
las pruebas intermitentes; esta corrida las muestra antes de que molesten.

`scripts/resumen-e2e-nocturno.mjs` lee el reporte JSON de Playwright y publica en el resumen del job
una tabla con cada prueba que fallo alguna vez: cuantas de las corridas, si es **intermitente**
(falla a veces) o **falla siempre**, y la primera linea del error. Si alguna fallo, el job queda en
rojo; no abre issues ni avisa por otro medio. El reporte JSON y las trazas quedan como artefacto
14 dias. Se puede lanzar a mano (Actions → "E2E nocturno" → Run workflow) con otra cantidad de
repeticiones. La sesion del administrador E2E se crea una vez, asi que la corrida usa
`E2E_JWT_EXPIRES_IN=4h` (en los PR sigue siendo 1 h). En local:

```bash
cd apps/web
PLAYWRIGHT_JSON_OUTPUT_NAME=e2e-nocturno.json npx playwright test --project=chromium --project=movil \
  --repeat-each=3 --retries=0 --reporter=dot,json
node ../../scripts/resumen-e2e-nocturno.mjs e2e-nocturno.json
```

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

Todas las rutas van bajo `/api` y, salvo `health`, `autenticacion/login` y el alta inicial de
usuario, piden sesion. El mapa completo, con que hace cada modulo, esta en
[docs/arquitectura-backend.md](docs/arquitectura-backend.md#mapa-de-modulos).

- `/api/health` (estado de la API y la base, sin sesion)
- `/api/autenticacion` (login con limite de intentos, `me`)
- `/api/usuarios` (gestion solo para administradores; cada uno cambia su clave)
- `/api/categorias`, `/api/items-catalogo` (con receta e imagenes), `/api/items-catalogo/importacion`
- `/api/clientes` (con `/:id/resumen` de compras), `/api/clientes/importacion`
- `/api/stock` (existencias, historial, bajo stock, ajustes)
- `/api/pedidos` (items, estados, confirmar, repetir)
- `/api/produccion` (ordenes, iniciar, finalizar)
- `/api/solicitudes-especiales`
- `/api/panel` (`resumen` del Dashboard y `avisos` del encabezado)
- `/api/busqueda` (busqueda global)
- `/api/reportes` (ventas del mes y por mes; administradores)
- `/api/auditoria` (historial de cambios y de precio y costo; administradores)

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
- La proteccion contra duplicados concurrentes la da el lock por item: la verificacion de idempotencia y el insert quedan serializados para el mismo item y tipo de stock. Ademas, desde `20260924080000_unique_idempotencia_stock` la base lo garantiza con el indice unico parcial `UQ_ESTADO_STOCK_IDEMPOTENCIA` (sin los ajustes `MANUAL`, que pueden repetirse). Detalle en [docs/idempotencia-stock.md](docs/idempotencia-stock.md).

## Notas PostgreSQL

- Las migraciones versionadas viven en `apps/api/prisma/migrations`, desde `20260924000000_inicial_postgres` (las de SQL Server se descartaron; no hubo migracion de datos). Todas las posteriores son aditivas, porque los deploy previews corren contra la base de produccion sin migrar.
- Hay indices que Prisma no modela y viven solo en SQL crudo de las migraciones: los unicos sobre `lower(usuario)` y `lower(email)` y el unico parcial de idempotencia de stock.
- Solo el deploy de produccion corre `prisma migrate deploy`; los deploy previews no migran porque usan la misma base (ver [docs/despliegue-netlify.md](docs/despliegue-netlify.md)).
- Diferencias de comportamiento respecto de SQL Server (mayusculas en login/busquedas, tipos): ver [docs/despliegue-netlify.md](docs/despliegue-netlify.md).

## Despliegue

```bash
npm run build:netlify
```

Es el comando de build de `netlify.toml`: genera Prisma, migra (solo con `CONTEXT=production`) y exporta la web a `apps/web/out`. La function se empaqueta desde `apps/api/netlify/functions`.
