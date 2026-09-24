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
| `apps/api` | Node 20 + Express + TypeScript + Prisma, sobre **SQL Server** |
| `apps/web` | Next.js 15 (App Router) + React 19 + TypeScript |
| `docs/` | Arquitectura, endpoints por bloque, modelo de datos (`der-actualizado.md`), idempotencia del stock |
| `docs/http`, `apps/api/api.http` | Pedidos de ejemplo para probar la API a mano |

Cada módulo del backend (`apps/api/src/modulos/<modulo>/`) tiene cinco archivos:
`routes` → `controller` → `service` → `repository`, más `schemas` (zod). **Antes de escribir
uno nuevo, copiá la forma de uno que ya existe** (`clientes` es el más simple).

En la web, cada módulo tiene su página en `apps/web/app/(privado)/<modulo>/page.tsx`, sus
componentes en `src/components/modulos/<modulo>/`, su acceso a la API en `src/lib/modulos/` y
sus tipos en `src/types/`. Reusá los componentes de `src/components/ui` y `src/components/formularios`.

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

## Comandos

```bash
npm install                                        # desde la raíz
npm run check                                      # tipos de web y api (tsc --noEmit)
npm run build
npm run prisma:generate --workspace @myfirstproject/api
npm run dev                                        # web (3000) + api (3002); necesita la base
```

**`npm run check` tiene que pasar antes de cada commit.** Hoy es el único control que hay.

## La base de datos

La API necesita SQL Server (`apps/api/.env`, ver `.env.example`). **En una sesión en la nube no
hay SQL Server**, así que:

- Podés escribir código, migraciones de Prisma (`prisma migrate dev --create-only` no aplica
  nada) y pruebas que no dependan de la base.
- No inventes una base de reemplazo (SQLite, etc.) cambiando el `provider` de Prisma: rompe las
  migraciones reales.
- Si algo sólo se puede comprobar contra la base, decilo en el PR: *"no probado contra SQL
  Server"*.

## Pruebas

Todavía no hay ninguna. Si sumás, que sean de los **services**, con el repository reemplazado
por uno falso. Ahí vive la lógica, y así corren sin base. Empezá por `stock`, `pedidos` y
`produccion`, que son las que mueven stock. Usá `vitest`. Agregá el script `test` en
`apps/api/package.json` y un `npm test` en la raíz.

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
- **Web:** ingreso, panel, y administración de categorías, ítems del catálogo, clientes y
  solicitudes especiales.
- **Falta la web de stock, pedidos y producción**, que es lo que más usa Maxi.
- No hay pruebas ni pipeline.
