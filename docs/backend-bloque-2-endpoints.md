# Backend Bloque 2

## Stock

- `GET /api/stock/actual?idItemCatalogo=1&tipoStock=PRODUCTO`
- `GET /api/stock/historial?idItemCatalogo=1&tipoStock=PRODUCTO&limit=20&offset=0`
- `POST /api/stock/ajustes`

## Pedidos

- `GET /api/pedidos`
- `GET /api/pedidos/:id`
- `POST /api/pedidos`
- `POST /api/pedidos/:id/detalles`
- `PATCH /api/pedidos/:id/estado`
- `POST /api/pedidos/:id/confirmar`

## Produccion

- `GET /api/produccion`
- `GET /api/produccion/:id`
- `POST /api/produccion`
- `POST /api/produccion/:id/detalles`
- `PATCH /api/produccion/:id/estado`
- `POST /api/produccion/:id/iniciar`
- `POST /api/produccion/:id/finalizar`
