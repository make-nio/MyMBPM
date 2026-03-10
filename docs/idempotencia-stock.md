# Idempotencia De Stock

## Estado actual

La idempotencia del modulo de stock esta implementada como regla logica de servicio.

Punto central:

- [stock.service.ts](d:/CodexAgentProjects/MyFirstProject/apps/api/src/modulos/stock/stock.service.ts)

Antes de insertar un movimiento no manual, el servicio consulta si ya existe uno con la misma clave logica:

- `ORIGEN_MOVIMIENTO`
- `ID_REFERENCIA_ORIGEN`
- `ID_REFERENCIA_DETALLE`
- `ID_ITEM_CATALOGO`
- `TIPO_MOVIMIENTO`

## Respaldo en base

El modelo Prisma agrega:

- campo `ID_REFERENCIA_DETALLE` en `ESTADO_STOCK`
- indice `IX_ESTADO_STOCK_IDEMPOTENCIA`

Ese indice mejora busqueda y consistencia operativa, pero no impone unicidad.

## Limitacion actual

Hoy no existe una restriccion `UNIQUE` en base que impida duplicados concurrentes.

Entonces:

- la idempotencia efectiva sigue siendo logica
- ante concurrencia alta, dos transacciones podrian insertar el mismo movimiento si ambas pasan la validacion al mismo tiempo

## Decision

Se mantiene este enfoque por ahora para no endurecer demasiado la base en esta etapa.

Si el sistema empieza a recibir operaciones concurrentes reales, el siguiente paso natural es evaluar:

- indice unico filtrado
- clave tecnica de idempotencia persistida
- bloqueo transaccional mas estricto
