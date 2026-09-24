# Idempotencia De Stock

## Estado actual

La idempotencia del modulo de stock esta implementada como regla logica de servicio.

Punto central:

- [stock.service.ts](../apps/api/src/modulos/stock/stock.service.ts)

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

## Concurrencia: lock por item

`registrarIngreso` y `registrarEgreso` toman `pg_advisory_xact_lock` sobre la clave
`stock:<TIPO_STOCK>:<ID_ITEM_CATALOGO>` antes de verificar la idempotencia y de leer el stock
anterior (`stockRepository.bloquearItem`). El lock se libera al terminar la transaccion. Asi:

- dos movimientos concurrentes del mismo item y tipo de stock se ejecutan de a uno: el segundo lee
  el stock que dejo el primero (sin esto, en `READ COMMITTED` ambos leen el mismo stock anterior);
- la verificacion de idempotencia y el insert tambien quedan serializados, asi que un reintento
  concurrente no duplica el movimiento.

Medido contra PostgreSQL con dos procesos de API (como dos instancias de la function) y 10
egresos concurrentes de 1 unidad sobre stock 1: sin el lock se aceptaban entre 7 y 9 egresos
(ventas de stock inexistente, con el stock final en 0 igual); con el lock, exactamente 1.

Requisitos para que funcione:

- el movimiento tiene que correr dentro de una transaccion (`prisma.$transaction`); fuera de una,
  el lock se libera al instante. Hoy todas las escrituras de stock cumplen esto;
- las operaciones que mueven varios items (confirmar pedido, iniciar o finalizar produccion) los
  procesan en orden de id (`ordenarPorItem`), para que dos transacciones no tomen los locks en
  orden cruzado y PostgreSQL aborte una por deadlock.

## Respaldo en base: indice unico parcial

Desde la migracion `20260924080000_unique_idempotencia_stock`, la base tambien lo garantiza:

```sql
CREATE UNIQUE INDEX "UQ_ESTADO_STOCK_IDEMPOTENCIA"
  ON "ESTADO_STOCK" ("ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE",
                     "ID_ITEM_CATALOGO", "TIPO_MOVIMIENTO")
  WHERE "ORIGEN_MOVIMIENTO" <> 'MANUAL';
```

- Son las mismas columnas que la verificacion del service. Los ajustes `MANUAL` quedan afuera
  porque pueden repetirse legitimamente.
- El service sigue verificando antes de insertar, bajo el lock. El indice solo actua si un cambio
  futuro se saltea esa verificacion: el INSERT falla con `P2002` y la API responde 409.
- Prisma no modela indices parciales, pero tampoco los detecta como drift (igual que los
  `UQ_USUARIO_*_LOWER`). No hay que declararlo en `schema.prisma`.
- La migracion primero busca duplicados y, si hay, corta con un mensaje claro. Consulta de solo
  lectura para revisar una base antes de migrar:

```sql
SELECT "ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE", "ID_ITEM_CATALOGO",
       "TIPO_MOVIMIENTO", COUNT(*) AS repeticiones
FROM "ESTADO_STOCK"
WHERE "ORIGEN_MOVIMIENTO" <> 'MANUAL'
GROUP BY 1, 2, 3, 4, 5
HAVING COUNT(*) > 1;
```
