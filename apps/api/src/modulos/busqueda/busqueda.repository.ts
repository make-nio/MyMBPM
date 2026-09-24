import { prisma } from "../../lib/prisma";

const insensible = (texto: string) => ({ contains: texto, mode: "insensitive" as const });

export const busquedaRepository = {
  // Por numero ("PED-000123", o solo "123") o por nombre/apellido del cliente.
  buscarPedidos(texto: string, limite: number) {
    return prisma.pedido.findMany({
      where: {
        OR: [
          { numeroPedido: insensible(texto) },
          { cliente: { nombre: insensible(texto) } },
          { cliente: { apellido: insensible(texto) } }
        ]
      },
      select: {
        idPedido: true,
        numeroPedido: true,
        estadoPedido: true,
        total: true,
        fechaAlta: true,
        cliente: { select: { nombre: true, apellido: true } }
      },
      orderBy: { idPedido: "desc" },
      take: limite
    });
  },

  // Los mismos campos que la busqueda de la pantalla de Clientes.
  buscarClientes(texto: string, limite: number) {
    return prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: insensible(texto) },
          { apellido: insensible(texto) },
          { telefono: insensible(texto) },
          { email: insensible(texto) },
          { documento: insensible(texto) }
        ]
      },
      select: { idCliente: true, nombre: true, apellido: true, telefono: true, email: true, activo: true },
      orderBy: [{ activo: "desc" }, { idCliente: "desc" }],
      take: limite
    });
  },

  buscarItems(texto: string, limite: number) {
    return prisma.itemCatalogo.findMany({
      where: { nombre: insensible(texto) },
      select: {
        idItemCatalogo: true,
        nombre: true,
        tipoItem: true,
        precio: true,
        costo: true,
        activo: true,
        categoria: { select: { nombre: true } }
      },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      take: limite
    });
  }
};
