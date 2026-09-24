-- Aditiva: dos indices, sin cambios de datos (ver docs/indices.md, con las mediciones).
-- - IX_ESTADO_STOCK_ITEM_TIPO_ULTIMO: el ultimo movimiento de cada item y tipo de stock (el stock
--   vigente) sale leyendo una entrada del indice por item, en vez de ordenar toda la tabla. Lo usan
--   Stock, el Dashboard y los avisos del encabezado.
-- - IX_PEDIDO_FECHA_CONFIRMACION: lo vendido en un rango (reportes y ventas del mes del Dashboard).
-- Las tablas son chicas: el CREATE INDEX (sin CONCURRENTLY, porque Prisma migra en una transaccion)
-- bloquea las escrituras un instante.

-- CreateIndex
CREATE INDEX "IX_ESTADO_STOCK_ITEM_TIPO_ULTIMO" ON "ESTADO_STOCK"("ID_ITEM_CATALOGO", "TIPO_STOCK", "ID_ESTADO_STOCK" DESC);

-- CreateIndex
CREATE INDEX "IX_PEDIDO_FECHA_CONFIRMACION" ON "PEDIDO"("FECHA_CONFIRMACION");
