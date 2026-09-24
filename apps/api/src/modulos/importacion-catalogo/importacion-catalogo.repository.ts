import { Prisma, PrismaClient } from "@prisma/client";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

// Clave fija del advisory lock que serializa las importaciones: dos importaciones a la vez no
// pueden crear el mismo item ni la misma categoria.
const CLAVE_BLOQUEO_IMPORTACION = 4_101_002;

export const importacionCatalogoRepository = {
  async bloquearImportacion(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_IMPORTACION})`;
  },

  // Solo los slugs y codigos que aparecen en el archivo: no hace falta traer el catalogo entero.
  async buscarExistentes(db: PrismaOrTx, slugs: string[], codigos: string[], categorias: string[]) {
    const [items, porCodigo, categoriasExistentes] = await Promise.all([
      db.itemCatalogo.findMany({ where: { slug: { in: slugs } }, select: { slug: true } }),
      codigos.length > 0
        ? db.itemCatalogo.findMany({
            where: { OR: codigos.map((codigo) => ({ codigo: { equals: codigo, mode: "insensitive" as const } })) },
            select: { codigo: true }
          })
        : Promise.resolve([]),
      categorias.length > 0
        ? db.categoria.findMany({
            where: { OR: categorias.map((nombre) => ({ nombre: { equals: nombre, mode: "insensitive" as const } })) },
            select: { idCategoria: true, nombre: true, slug: true }
          })
        : Promise.resolve([])
    ]);

    return { items, porCodigo, categorias: categoriasExistentes };
  },

  buscarCategoriasPorSlug(db: PrismaOrTx, slugs: string[]) {
    return db.categoria.findMany({ where: { slug: { in: slugs } }, select: { slug: true } });
  },

  // Todos los items en una consulta: con 1000 filas, uno por uno serian 1000 viajes a la base.
  crearItems(tx: Prisma.TransactionClient, datos: Prisma.ItemCatalogoCreateManyInput[]) {
    return tx.itemCatalogo.createManyAndReturn({ data: datos });
  },

  crearCategoria(tx: Prisma.TransactionClient, data: { nombre: string; slug: string }) {
    return tx.categoria.create({ data: { nombre: data.nombre, slug: data.slug, activo: true } });
  }
};
