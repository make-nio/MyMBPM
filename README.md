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

```bash
npm run prisma:generate --workspace @myfirstproject/api
npm run prisma:migrate --workspace @myfirstproject/api
```
