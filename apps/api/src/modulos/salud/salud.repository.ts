import { prisma } from "../../lib/prisma";

export const saludRepository = {
  // Una sola ida y vuelta: sirve para medir la latencia y trae la ultima migracion aplicada
  // (terminada y no revertida). null si la tabla de Prisma esta vacia.
  async consultarBase() {
    const [fila] = await prisma.$queryRaw<{ ultimaMigracion: string | null }[]>`
      SELECT (
        SELECT migration_name FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY finished_at DESC, migration_name DESC
        LIMIT 1
      ) AS "ultimaMigracion"`;

    return { ultimaMigracion: fila?.ultimaMigracion ?? null };
  }
};
