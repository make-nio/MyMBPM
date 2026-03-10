import { TipoItem } from "../../compartido/dominio/enums";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

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
        componentesComoPadre: {
          include: {
            itemCatalogoComponente: true
          },
          orderBy: {
            idItemCatalogoComponente: "asc"
          }
        },
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
  },

  listarComponentes(idItemCatalogoPadre: bigint) {
    return prisma.itemCatalogoComponente.findMany({
      where: {
        idItemCatalogoPadre
      },
      include: {
        itemCatalogoComponente: true
      },
      orderBy: {
        idItemCatalogoComponente: "asc"
      }
    });
  },

  obtenerComponente(idItemCatalogoComponente: bigint) {
    return prisma.itemCatalogoComponente.findUnique({
      where: { idItemCatalogoComponente },
      include: {
        itemCatalogoComponente: true
      }
    });
  },

  buscarComponentePorPadreEHijo(
    idItemCatalogoPadre: bigint,
    idItemCatalogoHijo: bigint,
    excluirIdItemCatalogoComponente?: bigint
  ) {
    const where: Prisma.ItemCatalogoComponenteWhereInput = {
      idItemCatalogoPadre,
      idItemCatalogoHijo
    };

    if (excluirIdItemCatalogoComponente) {
      where.NOT = {
        idItemCatalogoComponente: excluirIdItemCatalogoComponente
      };
    }

    return prisma.itemCatalogoComponente.findFirst({ where });
  },

  crearComponente(data: {
    idItemCatalogoPadre: bigint;
    idItemCatalogoHijo: bigint;
    cantidadRequerida: number;
    unidadMedida: string;
    activo?: boolean;
  }) {
    return prisma.itemCatalogoComponente.create({
      data: {
        ...data
      },
      include: {
        itemCatalogoComponente: true
      }
    });
  },

  actualizarComponente(
    idItemCatalogoComponente: bigint,
    data: Partial<{
      idItemCatalogoHijo: bigint;
      cantidadRequerida: number;
      unidadMedida: string;
      activo: boolean;
    }>
  ) {
    return prisma.itemCatalogoComponente.update({
      where: { idItemCatalogoComponente },
      data,
      include: {
        itemCatalogoComponente: true
      }
    });
  },

  eliminarComponente(idItemCatalogoComponente: bigint) {
    return prisma.itemCatalogoComponente.delete({
      where: { idItemCatalogoComponente }
    });
  }
};
