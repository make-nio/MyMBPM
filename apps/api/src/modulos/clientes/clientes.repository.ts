import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

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
        { nombre: { contains: filtros.busqueda, mode: "insensitive" } },
        { apellido: { contains: filtros.busqueda, mode: "insensitive" } },
        { telefono: { contains: filtros.busqueda, mode: "insensitive" } },
        { email: { contains: filtros.busqueda, mode: "insensitive" } },
        { documento: { contains: filtros.busqueda, mode: "insensitive" } }
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

  obtenerPorId(idCliente: bigint, db: PrismaOrTx = prisma) {
    return db.cliente.findUnique({
      where: { idCliente }
    });
  },

  crear(data: CrearClienteInput, db: PrismaOrTx = prisma) {
    return db.cliente.create({
      data: {
        ...data,
        activo: data.activo ?? true
      }
    });
  },

  actualizar(idCliente: bigint, data: ActualizarClienteInput, db: PrismaOrTx = prisma) {
    return db.cliente.update({
      where: { idCliente },
      data
    });
  }
};
