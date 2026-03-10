import { TipoItem } from "../../compartido/dominio/enums";
import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
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

  async validarItemExiste(idItemCatalogo: bigint) {
    const item = await prisma.itemCatalogo.findUnique({
      where: { idItemCatalogo }
    });

    if (!item) {
      throw new ErrorNoEncontrado("Item de catalogo no encontrado");
    }

    return item;
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
  },

  async listarComponentes(idItemCatalogoPadre: bigint) {
    await this.validarItemExiste(idItemCatalogoPadre);
    return itemsCatalogoRepository.listarComponentes(idItemCatalogoPadre);
  },

  async validarComponente(
    idItemCatalogoPadre: bigint,
    idItemCatalogoHijo: bigint,
    excluirIdItemCatalogoComponente?: bigint
  ) {
    await this.validarItemExiste(idItemCatalogoPadre);
    await this.validarItemExiste(idItemCatalogoHijo);

    if (idItemCatalogoPadre === idItemCatalogoHijo) {
      throw new ErrorConflicto("Un item no puede apuntarse a si mismo como componente");
    }

    const duplicado = await itemsCatalogoRepository.buscarComponentePorPadreEHijo(
      idItemCatalogoPadre,
      idItemCatalogoHijo,
      excluirIdItemCatalogoComponente
    );

    if (duplicado) {
      throw new ErrorConflicto("Ya existe ese componente para el item seleccionado");
    }

    const cicloSimple = await itemsCatalogoRepository.buscarComponentePorPadreEHijo(
      idItemCatalogoHijo,
      idItemCatalogoPadre
    );

    if (cicloSimple) {
      throw new ErrorConflicto("No se permite un ciclo simple entre dos items");
    }
  },

  async agregarComponente(
    idItemCatalogoPadre: bigint,
    data: {
      idItemCatalogoHijo: bigint;
      cantidadRequerida: number;
      unidadMedida: string;
      activo?: boolean;
    }
  ) {
    await this.validarComponente(idItemCatalogoPadre, data.idItemCatalogoHijo);

    return itemsCatalogoRepository.crearComponente({
      idItemCatalogoPadre,
      ...data
    });
  },

  async actualizarComponente(
    idItemCatalogoPadre: bigint,
    idItemCatalogoComponente: bigint,
    data: Partial<{
      idItemCatalogoHijo: bigint;
      cantidadRequerida: number;
      unidadMedida: string;
      activo: boolean;
    }>
  ) {
    await this.validarItemExiste(idItemCatalogoPadre);

    const componente = await itemsCatalogoRepository.obtenerComponente(idItemCatalogoComponente);

    if (!componente || componente.idItemCatalogoPadre !== idItemCatalogoPadre) {
      throw new ErrorNoEncontrado("Componente no encontrado para el item seleccionado");
    }

    const idItemCatalogoHijo = data.idItemCatalogoHijo ?? componente.idItemCatalogoHijo;

    if (data.idItemCatalogoHijo) {
      await this.validarComponente(
        idItemCatalogoPadre,
        idItemCatalogoHijo,
        idItemCatalogoComponente
      );
    }

    return itemsCatalogoRepository.actualizarComponente(idItemCatalogoComponente, data);
  },

  async eliminarComponente(idItemCatalogoPadre: bigint, idItemCatalogoComponente: bigint) {
    await this.validarItemExiste(idItemCatalogoPadre);

    const componente = await itemsCatalogoRepository.obtenerComponente(idItemCatalogoComponente);

    if (!componente || componente.idItemCatalogoPadre !== idItemCatalogoPadre) {
      throw new ErrorNoEncontrado("Componente no encontrado para el item seleccionado");
    }

    return itemsCatalogoRepository.eliminarComponente(idItemCatalogoComponente);
  }
};
