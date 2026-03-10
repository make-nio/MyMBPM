import { ErrorNoEncontrado } from "../../compartido/errores/error-no-encontrado";

import { clientesRepository } from "./clientes.repository";

export const clientesService = {
  listar(filtros: { busqueda?: string; activo?: boolean; limit: number; offset: number }) {
    return clientesRepository.listar(filtros);
  },

  async obtenerPorId(idCliente: bigint) {
    const cliente = await clientesRepository.obtenerPorId(idCliente);

    if (!cliente) {
      throw new ErrorNoEncontrado("Cliente no encontrado");
    }

    return cliente;
  },

  crear(data: {
    nombre: string;
    apellido?: string;
    documento?: string;
    telefono?: string;
    email?: string;
    instagram?: string;
    domicilio?: string;
    localidad?: string;
    provincia?: string;
    observaciones?: string;
    activo?: boolean;
  }) {
    return clientesRepository.crear(data);
  },

  async actualizar(
    idCliente: bigint,
    data: Partial<{
      nombre: string;
      apellido?: string;
      documento?: string;
      telefono?: string;
      email?: string;
      instagram?: string;
      domicilio?: string;
      localidad?: string;
      provincia?: string;
      observaciones?: string;
      activo: boolean;
    }>
  ) {
    await this.obtenerPorId(idCliente);
    return clientesRepository.actualizar(idCliente, data);
  },

  async cambiarEstado(idCliente: bigint, activo: boolean) {
    await this.obtenerPorId(idCliente);
    return clientesRepository.actualizar(idCliente, { activo });
  }
};
