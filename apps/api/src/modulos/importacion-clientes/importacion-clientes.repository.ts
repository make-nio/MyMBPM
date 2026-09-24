import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Clave fija del advisory lock que serializa las importaciones de clientes (otra que la del
// catalogo): dos importaciones a la vez no pueden cargar el mismo cliente dos veces.
const CLAVE_BLOQUEO_IMPORTACION_CLIENTES = 4_101_003;

export type ClienteParaComparar = {
  nombre: string;
  apellido: string | null;
  documento: string | null;
  telefono: string | null;
  email: string | null;
};

export const importacionClientesRepository = {
  async bloquearImportacion(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_IMPORTACION_CLIENTES})`;
  },

  // Solo los clientes que podrian coincidir con el archivo (mismo email, documento o telefono,
  // normalizados igual que en validar-filas-clientes): no hace falta traer la tabla entera.
  buscarCandidatos(db: PrismaOrTx, emails: string[], documentos: string[], telefonos: string[]) {
    if (emails.length === 0 && documentos.length === 0 && telefonos.length === 0) {
      return Promise.resolve([] as ClienteParaComparar[]);
    }

    return db.$queryRaw<ClienteParaComparar[]>`
      SELECT "NOMBRE" AS nombre, "APELLIDO" AS apellido, "DOCUMENTO" AS documento,
             "TELEFONO" AS telefono, "EMAIL" AS email
      FROM "CLIENTE"
      WHERE lower("EMAIL") = ANY(${emails}::text[])
         OR lower(regexp_replace("DOCUMENTO", '[^0-9a-zA-Z]', '', 'g')) = ANY(${documentos}::text[])
         OR regexp_replace("TELEFONO", '[^0-9]', '', 'g') = ANY(${telefonos}::text[])`;
  },

  // Todos los clientes en una consulta: con 1000 filas, uno por uno serian 1000 viajes a la base.
  crearClientes(tx: Prisma.TransactionClient, datos: Prisma.ClienteCreateManyInput[]) {
    return tx.cliente.createManyAndReturn({ data: datos });
  }
};
