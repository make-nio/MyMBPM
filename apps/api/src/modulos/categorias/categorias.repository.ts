import { prisma } from "../../lib/prisma";

type FiltrosCategorias = {
  activo?: boolean;
  limit: number;
  offset: number;
};

type CrearCategoriaInput = {
  nombre: string;
  slug: string;
  descripcion?: string;
  activo?: boolean;
};

type ActualizarCategoriaInput = Partial<CrearCategoriaInput>;

export const categoriasRepository = {
  listar(filtros: FiltrosCategorias) {
    return prisma.categoria.findMany({
      where: {
        activo: filtros.activo
      },
      skip: filtros.offset,
      take: filtros.limit,
      orderBy: {
        idCategoria: "desc"
      }
    });
  },

  obtenerPorId(idCategoria: bigint) {
    return prisma.categoria.findUnique({
      where: { idCategoria }
    });
  },

  crear(data: CrearCategoriaInput) {
    return prisma.categoria.create({
      data: {
        nombre: data.nombre,
        slug: data.slug,
        descripcion: data.descripcion,
        activo: data.activo ?? true
      }
    });
  },

  actualizar(idCategoria: bigint, data: ActualizarCategoriaInput) {
    return prisma.categoria.update({
      where: { idCategoria },
      data
    });
  }
};
