# MLM BPM

Base de trabajo para `MLM_BPM`, un sistema de gestion para catalogo, clientes, pedidos, stock y produccion, montado como monorepo con `npm workspaces`.

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
- La base de datos usa SQL Server con Prisma en `apps/api`.
- El backend sigue convenciones del dominio: rutas y modulos en espanol.

## Estado actual

Hoy el foco esta en `apps/api`.

Documentacion de arquitectura backend:

- [docs/arquitectura-backend.md](d:/CodexAgentProjects/MyFirstProject/docs/arquitectura-backend.md)

Backend implementado hasta ahora:

- infraestructura compartida de errores, validacion y rutas
- modulos base: categorias, items-catalogo y clientes
- nucleo critico: stock, pedidos y produccion

Pendiente para la siguiente etapa:

- solicitudes especiales
- usuarios
- autenticacion
- frontend funcional sobre `apps/web`

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

Actualmente el backend esta preparado para usar SQL Server via `DATABASE_URL` en `apps/api/.env`, con `SHADOW_DATABASE_URL` para migraciones.

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
- `/api/stock`
- `/api/pedidos`
- `/api/produccion`

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

## Notas SQL Server

- Con las credenciales actuales, Prisma puede conectarse y migrar usando shadow database.
- Las migraciones versionadas viven en `apps/api/prisma/migrations`.
