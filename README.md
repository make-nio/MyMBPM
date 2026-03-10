# MyFirstProject Monorepo

Base inicial para un sistema BPM en arquitectura monorepo usando `npm workspaces`.

## Estructura

```text
MyFirstProject/
  apps/
    web/   Next.js + React + TypeScript
    api/   Node.js + Express + TypeScript + Prisma
  package.json
  README.md
```

## Decisiones

- El backend existente fue reutilizado y movido a `apps/api`.
- El frontend vive en `apps/web` con Next.js App Router.
- La raiz del repositorio solo orquesta scripts, workspaces y documentacion.
- La estructura queda preparada para agregar mas apps o paquetes despues.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

```bash
npm install
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

## Build y checks

```bash
npm run build
npm run check
```

## Variables de entorno

- `.env.example`
- `apps/web/.env.example`
- `apps/api/.env.example`

## Prisma

El esquema inicial esta en `apps/api/prisma/schema.prisma`.

Actualmente la configuracion base del backend queda preparada para usar SQL Server via `DATABASE_URL` en `apps/api/.env`.

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

Nota importante para SQL Server:

- Con las credenciales actuales, Prisma puede conectarse y hacer `db push`.
- `prisma migrate dev` requiere crear una shadow database. Si el usuario no tiene permiso `CREATE DATABASE`, hay que usar otro usuario con ese permiso o definir una `SHADOW_DATABASE_URL` sobre una base shadow ya provisionada.
- Mientras no tengamos eso, el camino operativo para esta etapa es `db push`.
