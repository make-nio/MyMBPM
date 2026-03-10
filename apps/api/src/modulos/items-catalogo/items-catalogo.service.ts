import { TipoItem } from "../../compartido/dominio/enums";
import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";
import { prisma } from "../../lib/prisma";

import { itemsCatalogoRepository } from "./items-catalogo.repository";

export const itemsCatalogoService = {
  listar(filtros: {
    tipoItem?: TipoItem;
    idCategoria?: bigint;
    activo?: boolean;
    publico?: boolean;
    limit: number;
    offset: number;
  }) {
    return itemsCatalogoRepository.listar(filtros);
  },

  async obtenerPorId(idItemCatalogo: bigint) {
    const item = await itemsCatalogoRepository.obtenerPorId(idItemCatalogo);

    if (!item) {
      throw new ErrorNoEncontrado("Item de catalogo no encontrado");
    }

    return item;
  },

  async validarCategoria(idCategoria: bigint) {
    const categoria = await prisma.categoria.findUnique({
      where: { idCategoria }
    });

    if (!categoria) {
      throw new ErrorNoEncontrado("Categoria no encontrada");
    }
  },

  async crear(data: {
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
  }) {
    await this.validarCategoria(data.idCategoria);
    return itemsCatalogoRepository.crear(data);
  },

  async actualizar(
    idItemCatalogo: bigint,
    data: Partial<{
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
      activo: boolean;
      publico: boolean;
    }>
  ) {
    await this.obtenerPorId(idItemCatalogo);

    if (data.idCategoria) {
      await this.validarCategoria(data.idCategoria);
    }

    return itemsCatalogoRepository.actualizar(idItemCatalogo, data);
  },

  async cambiarEstado(idItemCatalogo: bigint, activo: boolean) {
    await this.obtenerPorId(idItemCatalogo);
    return itemsCatalogoRepository.actualizar(idItemCatalogo, { activo });
  },

  async agregarImagen(idItemCatalogo: bigint, data: { urlImagen: string; orden?: number; activo?: boolean }) {
    await this.obtenerPorId(idItemCatalogo);
    return itemsCatalogoRepository.crearImagenAdicional(idItemCatalogo, data);
  },

  async eliminarImagen(idItemCatalogo: bigint, idImagen: bigint) {
    await this.obtenerPorId(idItemCatalogo);

    const imagen = await itemsCatalogoRepository.obtenerImagen(idImagen);

    if (!imagen || imagen.idItemCatalogo !== idItemCatalogo) {
      throw new ErrorNoEncontrado("Imagen de item no encontrada");
    }

    return itemsCatalogoRepository.eliminarImagen(idImagen);
  }
};
