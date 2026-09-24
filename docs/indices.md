# Indices y consultas con volumen

Medicion de septiembre de 2026, para saber si con un negocio mucho mas grande que el de hoy
alguna consulta necesita un indice.

## Como se mide

- `apps/api/scripts/volumen/sembrar-volumen.sql` carga en una base **local**, vacia y migrada,
  lo siguiente:
  - 500 items (100 insumos, 400 productos) y 2.000 clientes;
  - 20.000 pedidos de los ultimos 3 anios, con 50.000 items;
  - 54.000 movimientos de stock;
  - 3.000 ordenes de produccion;
  - 7.300 registros de auditoria.
- `apps/api/scripts/volumen/medir-consultas.ts`:
  - llama a los services y repositories reales y captura el SQL que genera Prisma;
  - pasa cada consulta tres veces por `EXPLAIN (ANALYZE, BUFFERS)`;
  - informa la mediana, las tablas recorridas enteras (`Seq Scan`) y los ordenamientos en memoria
    (`Sort`);
  - se niega a correr si la base no es local.

```bash
createdb mymbpm_indices
cd apps/api
NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_indices \
  NETLIFY_DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/mymbpm_indices \
  npx prisma migrate deploy
NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_indices JWT_SECRET=x \
  npm run volumen:medir -- --sembrar
```

## Resultado

Tiempo total de las consultas de cada pantalla, en milisegundos (Postgres 16 local).

| Escenario | Antes | Despues | Que cambio |
| --- | --- | --- | --- |
| Stock: existencias | 61.2 | 3.7 | Ultimo movimiento por item con indice (abajo) |
| Avisos del encabezado (en cada cambio de pantalla) | 61.8 | 3.3 | Idem |
| Panel (Dashboard) | 76.6 | 11.0 | Idem, y ventas del mes con indice por fecha de confirmacion |
| Reportes: ventas del mes | 3.7 | 1.0 | `IX_PEDIDO_FECHA_CONFIRMACION` |
| Reportes: ventas por mes (12) | 3.3 | 1.8 | Idem |
| Pedidos: primera pagina, pagina 100, por estado, por fecha, de un cliente | 0.1 a 0.9 | igual | Ya usaban indices |
| Clientes: listado y busqueda | 0.0 a 1.0 | igual | 2.000 filas: recorrerlas es mas barato que un indice |
| Busqueda global "perez" / "PED-0123" | 4.6 / 38.0 | igual | Ver "Lo que no se cambio" |
| Movimientos de un item, auditoria | 0.0 a 0.4 | igual | Ya usaban indices |

### Stock vigente: `IX_ESTADO_STOCK_ITEM_TIPO_ULTIMO`

El stock vigente de un item es el `STOCK_ACTUAL` de su ultimo movimiento en `ESTADO_STOCK`.
`stockRepository.listarUltimosEstados` lo buscaba con
`SELECT DISTINCT ON (item, tipo) ... ORDER BY item, tipo, id DESC`. Solo habia indice por item,
asi que Postgres **leia y ordenaba todos los movimientos** (51.000 filas, ~61 ms). El costo crece
con cada venta, y lo pagan Stock, el Dashboard y los avisos del encabezado en cada pantalla.

- Indice nuevo: `("ID_ITEM_CATALOGO", "TIPO_STOCK", "ID_ESTADO_STOCK" DESC)`.
- La consulta pasa a `CROSS JOIN LATERAL (... ORDER BY "ID_ESTADO_STOCK" DESC LIMIT 1)` por cada
  item y tipo: una lectura del indice por par, que no crece con la cantidad de movimientos.
- Devuelve lo mismo que la anterior: se compararon las dos sobre el volumen (501 filas, 0
  diferencias, con un item que tiene movimientos de los dos tipos). Los pares sin movimientos no
  devuelven fila, como antes.

### Ventas: `IX_PEDIDO_FECHA_CONFIRMACION`

Lo vendido en un rango (reportes, ventas del mes del Dashboard) filtra por `FECHA_CONFIRMACION`,
que no tenia indice: se recorrian los 20.000 pedidos. Con el indice lee solo los del rango.

## Lo que no se cambio (y por que)

- **Busqueda global de pedidos (~33 ms con 20.000).** Busca `contiene` (`ILIKE '%texto%'`) en el
  numero de pedido y en el nombre y apellido del cliente, con `OR` sobre la union. Un B-tree no
  sirve para `%texto%`: haria falta un indice de trigramas (`pg_trgm`, GIN), que suma una extension
  a la base. Con 33 ms en una busqueda que se dispara al dejar de escribir, no lo justifica. Si el
  negocio llega a ese volumen y se nota, es el siguiente paso.
- **Conteo de pedidos por estado en el Dashboard (~6 ms).** Un `GROUP BY` sobre todos los pedidos
  activos crece con el historial, pero es lineal y barato. Un indice no lo cambia de orden.
- **`IX_ESTADO_STOCK_ID_ITEM_CATALOGO`** queda cubierto por el indice nuevo (es su prefijo), pero
  no se borra: la migracion es solo aditiva, porque los deploy previews corren contra la base de
  produccion sin migrar. Se puede sacar mas adelante.
