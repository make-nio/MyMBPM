-- Aditiva: respaldo en base de la idempotencia de stock (ver docs/idempotencia-stock.md).
-- stock.service ya evita duplicados con una verificacion bajo lock; este indice lo garantiza
-- aunque un cambio futuro se saltee esa verificacion. Los ajustes MANUAL quedan afuera: pueden
-- repetirse legitimamente.
--
-- Si ya hubiera movimientos duplicados, crear el indice fallaria con un error poco claro: se
-- cortan antes con un mensaje que dice que buscar (la consulta esta en el PR y en la doc).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ESTADO_STOCK"
    WHERE "ORIGEN_MOVIMIENTO" <> 'MANUAL'
    GROUP BY "ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE", "ID_ITEM_CATALOGO", "TIPO_MOVIMIENTO"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'ESTADO_STOCK tiene movimientos duplicados: revisarlos antes de crear UQ_ESTADO_STOCK_IDEMPOTENCIA (docs/idempotencia-stock.md)';
  END IF;
END $$;

-- Prisma no modela indices parciales; tampoco los detecta como drift (igual que UQ_USUARIO_*_LOWER).
CREATE UNIQUE INDEX "UQ_ESTADO_STOCK_IDEMPOTENCIA"
  ON "ESTADO_STOCK" ("ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE", "ID_ITEM_CATALOGO", "TIPO_MOVIMIENTO")
  WHERE "ORIGEN_MOVIMIENTO" <> 'MANUAL';
