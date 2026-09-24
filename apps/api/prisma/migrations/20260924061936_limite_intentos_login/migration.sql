-- Aditiva: sólo crea INTENTO_LOGIN. No toca tablas existentes, así que el código anterior sigue
-- funcionando con la base migrada, y el código nuevo tolera que la tabla falte (deploy preview).

-- CreateTable
CREATE TABLE "INTENTO_LOGIN" (
    "ID_INTENTO_LOGIN" BIGSERIAL NOT NULL,
    "CLAVE" VARCHAR(200) NOT NULL,
    "FECHA" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "INTENTO_LOGIN_pkey" PRIMARY KEY ("ID_INTENTO_LOGIN")
);

-- CreateIndex
CREATE INDEX "IX_INTENTO_LOGIN_CLAVE_FECHA" ON "INTENTO_LOGIN"("CLAVE", "FECHA");

-- CreateIndex
CREATE INDEX "IX_INTENTO_LOGIN_FECHA" ON "INTENTO_LOGIN"("FECHA");
