import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";

import { categoriasRepository } from "./categorias.repository";

export const categoriasService = {
  listar(filtros: { activo?: boolean; limit: number; offset: number }) {
    return categoriasRepository.listar(filtros);
  },

  async obtenerPorId(idCategoria: bigint) {
    const categoria = await categoriasRepository.obtenerPorId(idCategoria);

    if (!categoria) {
      throw new ErrorNoEncontrado("Categoria no encontrada");
    }

    return categoria;
  },

  crear(data: {
    nombre: string;
    slug: string;
    descripcion?: string;
    activo?: boolean;
  }) {
    return categoriasRepository.crear(data);
  },

  async actualizar(
    idCategoria: bigint,
    data: Partial<{
      nombre: string;
      slug: string;
      descripcion?: string;
      activo: boolean;
    }>
  ) {
    await this.obtenerPorId(idCategoria);
    return categoriasRepository.actualizar(idCategoria, data);
  },

  async cambiarEstado(idCategoria: bigint, activo: boolean) {
    await this.obtenerPorId(idCategoria);
    return categoriasRepository.actualizar(idCategoria, { activo });
  }
};
