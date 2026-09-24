# CLAUDE.md — MyM BPM

Respondé siempre en español. El código, las rutas y los módulos también van en español; seguí lo
que ya existe.

## Qué es

Sistema de gestión para **MyM**, el emprendimiento de impresión 3D de Maxi, amigo de Mariano.
Organiza lo que vende —un catálogo de ítems, cada uno armado con sus componentes—, los clientes,
los **pedidos**, el **stock** y la **producción**. Las "solicitudes especiales" son los pedidos a
medida, lo que no está en el catálogo.

Lo usa una sola persona o muy pocas, desde un panel privado con usuario y contraseña. Tiene que
ser simple de operar: Maxi imprime, no administra sistemas.

## Cómo está armado

Monorepo con `npm workspaces`:

| Carpeta | Qué es |
|---|---|
| `apps/api` | Node 20 + Express + TypeScript + Prisma, sobre **PostgreSQL** (Netlify DB / Neon) |
| `apps/web` | Next.js 15 (App Router) + React 19 + TypeScript, publicado como export estático |
| `docs/` | Arquitectura, endpoints por bloque, modelo de datos (`der-actualizado.md`), idempotencia del stock |
| `docs/http`, `apps/api/api.http` | Pedidos de ejemplo para probar la API a mano |

Cada módulo del backend (`apps/api/src/modulos/<modulo>/`) tiene cinco archivos:
`routes` → `controller` → `service` → `repository`, más `schemas` (zod). **Antes de escribir
uno nuevo, copiá la forma de uno que ya existe** (`clientes` es el más simple).

En la web, cada módulo tiene su página en `apps/web/app/(privado)/<modulo>/page.tsx`, sus
componentes en `src/components/modulos/<modulo>/`, su acceso a la API en `src/lib/modulos/` y
sus tipos en `src/types/`. Reusá los componentes de `src/components/ui` y `src/components/formularios`.

La API devuelve como mucho 100 filas por pedido y no manda totales. Las tablas cargan de a 50 con
`useListadoPaginado` y muestran `PieListado` ("Cargar mas" y el aviso). Para elegir un cliente o
un ítem en un formulario usá `CampoSelectBuscable`, que busca en el servidor. Nunca precargues una
lista entera para un `select`.

## Reglas del negocio que no se rompen

Vienen de `docs/arquitectura-backend.md`. Leelo entero antes de tocar el backend.

1. **El stock sólo se modifica desde `stock.service.ts`.** Ningún otro módulo toca las tablas de
   stock, ni siquiera "para un caso chico".
2. **Toda operación que mueve stock va en una transacción.**
3. Los services no usan Prisma directo si existe un repository.
4. Los controllers no tienen lógica de negocio.
5. Las entidades críticas usan los enums de dominio (`src/compartido/dominio/enums.ts`).
6. El stock tiene idempotencia (`docs/idempotencia-stock.md`): reintentar una operación no
   puede descontar dos veces.
7. Cada movimiento toma un lock por ítem (`stockRepository.bloquearItem`) y tiene que correr en
   transacción. Si una operación mueve varios ítems, procesalos con `ordenarPorItem` para no
   provocar deadlocks.

## Comandos

```bash
npm install                                        # desde la raíz (corre prisma generate)
npm run check                                      # tipos de web y api (tsc --noEmit, incluye tests)
npm test                                           # vitest de api (services) y web (src/lib), sin base
npm run test:e2e                                   # Playwright; solo contra un Postgres local
npm run build
npm run prisma:generate --workspace @myfirstproject/api
npm run dev                                        # web (3000) + api (3002); necesita la base
```

**`npm run check` y `npm test` tienen que pasar antes de cada commit.** El CI
(`.github/workflows/ci.yml`) corre ademas build, E2E y cobertura en cada PR.

## La base de datos

PostgreSQL (Netlify DB / Neon), `provider = "postgresql"` en Prisma. La API lee
`NETLIFY_DATABASE_URL` (conexión pooled) y Prisma Migrate usa `NETLIFY_DATABASE_URL_UNPOOLED`
(conexión directa). En local van en `apps/api/.env` (ver `.env.example`); pueden ser la misma URL
de un Postgres local.

- Todo cambio de schema va con migración versionada (`prisma migrate dev --name <nombre>`). El
  deploy corre `prisma migrate deploy`.
- Postgres distingue mayúsculas: el login y la búsqueda de clientes usan `mode: "insensitive"`,
  y usuario/email tienen índices únicos sobre `lower(...)` (SQL crudo en la migración inicial).
- Si algo sólo se puede comprobar contra la base real (Neon), decilo en el PR.

## Despliegue

Un solo sitio de Netlify (`netlify.toml`), detalle en `docs/despliegue-netlify.md`:

- La web se publica como sitio estático desde `apps/web/out`.
- La API corre como Netlify Function (`serverless-http`) bajo `/api/*`, en el mismo dominio: no
  hay CORS. En local, `next dev` reenvía `/api/*` a la API (`API_DEV_URL`).
- El build es `npm run build:netlify`: genera Prisma, aplica migraciones **solo en produccion**
  y exporta la web. Los deploy previews usan la base de produccion y no migran: las migraciones
  tienen que ser aditivas y se avisan en el PR (ver `docs/despliegue-netlify.md`).
- Variables del sitio: `NETLIFY_DATABASE_URL` y `NETLIFY_DATABASE_URL_UNPOOLED` (las inyecta
  Netlify DB), `JWT_SECRET` y `JWT_EXPIRES_IN`.

## Pruebas

`npm test` desde la raíz corre `vitest` en `apps/api` y `apps/web`. En la API las pruebas son de
los **services** (`src/modulos/<modulo>/<modulo>.service.test.ts`), con el repository y
`prisma.$transaction` mockeados: corren sin base. Si tocás un service, sumá o ajustá su prueba.

Cada pantalla tiene su E2E en `apps/web/e2e/<modulo>.spec.ts` (Playwright). Importá `test` y
`expect` de `e2e/fixtures.ts`, usá `unico("PRUEBA-...")` para los nombres y `e2e/api.ts` para
preparar datos. Los E2E **nunca** corren contra la base de producción: la config lo impide.
La cobertura (umbral 70 % de líneas, backend y front, combinando vitest y E2E) se publica en el
resumen del CI. Además, vitest solo tiene un piso propio (`coverage.thresholds` en cada
`vitest.config.ts`: 47 % api, 45 % web) para que la cobertura unitaria no retroceda.

`e2e/accesibilidad.spec.ts` pasa axe (WCAG 2.1 A y AA) por cada pantalla, su modal de alta y los
detalles. Falla ante violaciones serias o críticas. Si sumás una pantalla, agregala ahí, y dale
nombre accesible (`label` o `aria-label`) a todo control, filtros incluidos.

La web se usa también desde el celular (375 px): en pantallas angostas el menú se pliega y las
tablas de `TablaDatos` se ven como tarjetas. Si sumás una pantalla, agregala a la lista de
`e2e/movil.spec.ts` (proyecto `movil` de Playwright).

## Cómo se trabaja

- La rama principal es **`main`**. Nunca se commitea directo ahí.
- Una rama corta por tarea, desde `main`: `feat/...`, `fix/...`, `chore/...`.
- Commits chicos, en español, que digan qué cambia.
- Al terminar, **abrí un PR hacia `main` y no lo integres**: lo revisa Mariano.
- En el PR: qué hiciste, cómo lo comprobaste y qué quedó sin probar.
- Nunca subas un `.env` ni credenciales. El repositorio es **público**.

## Estado (marzo 2026)

- **Backend:** todos los módulos hechos (catálogo, clientes, pedidos, stock, producción,
  usuarios, autenticación, solicitudes especiales).
- **Web:** ingreso, panel de inicio con datos reales (pedidos, producción, stock bajo y últimos
  movimientos), y administración de categorías, ítems del catálogo, clientes,
  solicitudes especiales, usuarios (sólo administradores), pedidos, producción (con el impacto en
  stock antes y después de confirmar, iniciar o finalizar) y stock (existencias, movimientos y
  ajustes), y una página de Ayuda para el día a día (`/ayuda`; si cambia un botón o un estado,
  actualizala).
- Hay pruebas de los services de stock, pedidos, producción y usuarios, E2E de las pantallas y
  CI en GitHub Actions.
