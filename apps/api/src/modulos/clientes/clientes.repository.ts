import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type ListarClientesFiltros = {
  busqueda?: string;
  activo?: boolean;
  limit: number;
  offset: number;
};

type CrearClienteInput = {
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
};

type ActualizarClienteInput = Partial<CrearClienteInput>;

export const clientesRepository = {
  listar(filtros: ListarClientesFiltros) {
    const where: Prisma.ClienteWhereInput = {
      activo: filtros.activo
    };

    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda } },
        { apellido: { contains: filtros.busqueda } },
        { telefono: { contains: filtros.busqueda } },
        { email: { contains: filtros.busqueda } },
        { documento: { contains: filtros.busqueda } }
      ];
    }

    return prisma.cliente.findMany({
      where,
      skip: filtros.offset,
      take: filtros.limit,
      orderBy: {
        idCliente: "desc"
      }
    });
  },

  obtenerPorId(idCliente: bigint) {
    return prisma.cliente.findUnique({
      where: { idCliente }
    });
  },

  crear(data: CrearClienteInput) {
    return prisma.cliente.create({
      data: {
        ...data,
        activo: data.activo ?? true
      }
    });
  },

  actualizar(idCliente: bigint, data: ActualizarClienteInput) {
    return prisma.cliente.update({
      where: { idCliente },
      data
    });
  }
};
