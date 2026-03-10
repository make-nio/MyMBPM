import { TipoItem } from "../../compartido/dominio/enums";
import { prisma } from "../../lib/prisma";

type FiltrosItemsCatalogo = {
  tipoItem?: TipoItem;
  idCategoria?: bigint;
  activo?: boolean;
  publico?: boolean;
  limit: number;
  offset: number;
};

type CrearItemCatalogoInput = {
  idCategoria: bigint;
  tipoItem: TipoItem;
  nombre: string;
  slug: string;
  codigo?: string;
  descripcionCorta?: string;
  descripcionCompleta?: string;
  observacionesInternas?: string;
  precio?: number;
  costo?: number;
  tipoMaterial?: string;
  color?: string;
  imagenPrincipal?: string;
  stockMinimo?: number;
  activo?: boolean;
  publico?: boolean;
};

type ActualizarItemCatalogoInput = Partial<CrearItemCatalogoInput>;

export const itemsCatalogoRepository = {
  listar(filtros: FiltrosItemsCatalogo) {
    return prisma.itemCatalogo.findMany({
      where: {
        tipoItem: filtros.tipoItem,
        idCategoria: filtros.idCategoria,
        activo: filtros.activo,
        publico: filtros.publico
      },
      skip: filtros.offset,
      take: filtros.limit,
      include: {
        categoria: true,
        imagenes: {
          where: {
            activo: true
          },
          orderBy: {
            orden: "asc"
          }
        }
      },
      orderBy: {
        idItemCatalogo: "desc"
      }
    });
  },

  obtenerPorId(idItemCatalogo: bigint) {
    return prisma.itemCatalogo.findUnique({
      where: { idItemCatalogo },
      include: {
        categoria: true,
        imagenes: {
          orderBy: {
            orden: "asc"
          }
        }
      }
    });
  },

  crear(data: CrearItemCatalogoInput) {
    return prisma.itemCatalogo.create({
      data: {
        ...data
      },
      include: {
        categoria: true
      }
    });
  },

  actualizar(idItemCatalogo: bigint, data: ActualizarItemCatalogoInput) {
    return prisma.itemCatalogo.update({
      where: { idItemCatalogo },
      data,
      include: {
        categoria: true,
        imagenes: true
      }
    });
  },

  crearImagenAdicional(idItemCatalogo: bigint, data: { urlImagen: string; orden?: number; activo?: boolean }) {
    return prisma.itemCatalogoImagen.create({
      data: {
        idItemCatalogo,
        urlImagen: data.urlImagen,
        orden: data.orden ?? 1,
        activo: data.activo ?? true
      }
    });
  },

  obtenerImagen(idItemCatalogoImagen: bigint) {
    return prisma.itemCatalogoImagen.findUnique({
      where: { idItemCatalogoImagen }
    });
  },

  eliminarImagen(idItemCatalogoImagen: bigint) {
    return prisma.itemCatalogoImagen.delete({
      where: { idItemCatalogoImagen }
    });
  }
};
