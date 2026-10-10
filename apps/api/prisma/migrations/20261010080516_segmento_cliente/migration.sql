-- Aditiva (#100): el tipo de cliente. Columna con default: los clientes que ya existen quedan
-- CONSUMIDOR. Los valores validos (CONSUMIDOR, COMERCIO, REVENDEDOR) los controla la API
-- (SEGMENTOS_CLIENTE en enums.ts), como los demas estados: sin CHECK en la base.

-- AlterTable
ALTER TABLE "CLIENTE" ADD COLUMN     "SEGMENTO" VARCHAR(20) NOT NULL DEFAULT 'CONSUMIDOR';

-- CreateIndex
CREATE INDEX "IX_CLIENTE_SEGMENTO" ON "CLIENTE"("SEGMENTO");
