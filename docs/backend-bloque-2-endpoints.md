# Backend Bloque 2

## Stock

- `GET /api/stock/actual?idItemCatalogo=1&tipoStock=PRODUCTO`
- `GET /api/stock/historial?idItemCatalogo=1&tipoStock=PRODUCTO&limit=20&offset=0`
  - Opcionales `origenMovimiento` (`MANUAL`, `PEDIDO`, `PRODUCCION`) e `idReferenciaOrigen`: los
    movimientos de un pedido u orden puntual, sin depender de los ultimos N del item.
- `GET /api/stock/existencias?activo=true&tipoItem=INSUMO&busqueda=vela&soloBajoMinimo=true&limit=51&offset=0`
  - Todos los filtros son opcionales. **Sin `limit` devuelve todas** (como siempre); con `limit`
    (hasta 100), la pagina pedida, despues de filtrar. La web pide de a 50 (+1 para saber si hay mas).
- `POST /api/stock/ajustes` (`observaciones` obligatorio: el motivo del ajuste)

## Pedidos

- `GET /api/pedidos?estadoPedido=CONFIRMADO&desde=2026-09-01&hasta=2026-09-30&limit=100&offset=0`
  - `desde` y `hasta` (opcionales, `AAAA-MM-DD`) filtran por fecha de alta, los dos dias incluidos,
    en hora de Argentina. Un rango invertido es 400. La web los usa para el listado y para
    "Exportar CSV", que arma el archivo en el navegador pidiendo todas las paginas.
- `GET /api/pedidos/:id`
- `POST /api/pedidos`
  - Opcional `fechaEntrega`: el dia de entrega prometido al cliente (`"2026-09-30"`). Se guarda
    en `FECHA_ENTREGA` como las 00:00 de ese dia en Argentina.
- `POST /api/pedidos/:id/detalles`
- `PATCH /api/pedidos/:id/estado`
  - Tambien acepta `fechaEntrega` (`"AAAA-MM-DD"` o `null` para borrarla), salvo en pedidos
    `ENTREGADO` o `CANCELADO` (409).
- `POST /api/pedidos/:id/confirmar`

## Produccion

- `GET /api/produccion`
- `GET /api/produccion/:id`
- `POST /api/produccion`
- `POST /api/produccion/:id/detalles`
- `PATCH /api/produccion/:id/estado`
- `POST /api/produccion/:id/iniciar`
- `POST /api/produccion/:id/finalizar`

## Reportes

- `GET /api/reportes/ventas-mes?mes=2026-09` (solo administradores; sin `mes`, el mes en curso)
  - Mismo criterio que "Este mes" del panel: pedidos activos confirmados en el mes (hora de
    Argentina) y no cancelados. Devuelve `totales` (pedidos, vendido, costo, ganancia, lineas sin
    costo), `porItem` (cantidad, pedidos, vendido = suma de subtotales, costo = snapshot de cada
    linea, ganancia) y `porCliente` (pedidos, vendido = suma de totales, costo, ganancia), de mayor
    a menor vendido. La web arma el CSV de cada tabla.
- `GET /api/reportes/ventas-por-mes` (solo administradores)
  - Vendido y cantidad de pedidos de cada uno de los ultimos 12 meses (el actual incluido, hora de
    Argentina), con el mismo criterio de `ventas-mes`. Vienen los 12, tambien los meses sin ventas.
    La web lo dibuja en Reportes con un SVG propio (sin librerias de graficos).
