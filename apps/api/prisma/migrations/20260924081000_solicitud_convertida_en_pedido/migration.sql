-- Aditiva: columna nullable nueva en SOLICITUD_ESPECIAL (el pedido creado al convertirla), con FK
-- y unico (a lo sumo un pedido por solicitud). Es nueva y vacia: el unico no puede fallar.

-- AlterTable
ALTER TABLE "SOLICITUD_ESPECIAL" ADD COLUMN     "ID_PEDIDO" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "UQ_SOLICITUD_ESPECIAL_ID_PEDIDO" ON "SOLICITUD_ESPECIAL"("ID_PEDIDO");

-- AddForeignKey
ALTER TABLE "SOLICITUD_ESPECIAL" ADD CONSTRAINT "SOLICITUD_ESPECIAL_ID_PEDIDO_fkey" FOREIGN KEY ("ID_PEDIDO") REFERENCES "PEDIDO"("ID_PEDIDO") ON DELETE NO ACTION ON UPDATE NO ACTION;

