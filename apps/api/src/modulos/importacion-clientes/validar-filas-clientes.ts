import { z } from "zod";

import { leerSiNo, texto } from "../importacion-catalogo/validar-filas";

import { FilaImportacionCliente } from "./importacion-clientes.schemas";

export type ClienteImportable = {
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
};

export type FilaValidadaCliente = {
  // Numero de fila del archivo: la 1 es el encabezado, la primera de datos es la 2.
  numero: number;
  errores: string[];
  cliente: ClienteImportable | null;
};

// Claves de los clientes que ya existen, normalizadas como las de claveEmail/claveDocumento/
// clavePersona: con eso se detecta un cliente repetido sin traer la tabla entera.
export type ClientesExistentes = {
  emails: Set<string>;
  documentos: Set<string>;
  personas: Set<string>;
};

const esEmail = z.string().email();

export const claveEmail = (email: string) => email.trim().toLowerCase();
// "20.123.456" y "20123456" son el mismo documento.
export const claveDocumento = (documento: string) => documento.replace(/[^0-9a-z]/gi, "").toLowerCase();
// Mismo nombre, apellido y telefono (sin espacios ni guiones): el mismo cliente cargado dos veces.
export const clavePersona = (nombre: string, apellido: string | undefined, telefono: string) =>
  [nombre, apellido ?? "", telefono.replace(/\D/g, "")].map((parte) => parte.trim().toLowerCase()).join("|");

// Largos maximos: los mismos que acepta el alta de un cliente (clientes.schemas.ts).
const LARGOS: Array<[keyof FilaImportacionCliente, string, number]> = [
  ["nombre", "Nombre", 120],
  ["apellido", "Apellido", 120],
  ["documento", "Documento", 30],
  ["telefono", "Telefono", 50],
  ["email", "Email", 150],
  ["instagram", "Instagram", 150],
  ["domicilio", "Domicilio", 250],
  ["localidad", "Localidad", 120],
  ["provincia", "Provincia", 120],
  ["observaciones", "Observaciones", 2000]
];

// Valida y convierte las filas del CSV. No toca la base: recibe lo que ya existe. Una fila con
// errores no se importa y, como la importacion es todo o nada, frena el archivo entero.
//
// Un cliente se considera repetido (en la base o en el mismo archivo) si coincide el email, el
// documento o el nombre + apellido + telefono. Solo el nombre no alcanza: puede haber dos "Ana".
export function validarFilasClientes(filas: FilaImportacionCliente[], existentes: ClientesExistentes) {
  const vistos = { emails: new Map<string, number>(), documentos: new Map<string, number>(), personas: new Map<string, number>() };

  const validadas: FilaValidadaCliente[] = filas.map((fila, indice) => {
    const numero = indice + 2;
    const errores: string[] = [];
    const valores = Object.fromEntries(
      Object.keys(fila).map((campo) => [campo, texto(fila[campo as keyof FilaImportacionCliente])])
    ) as Partial<Record<keyof FilaImportacionCliente, string>>;

    if (!valores.nombre) {
      errores.push("Nombre: es obligatorio");
    }
    for (const [campo, etiqueta, maximo] of LARGOS) {
      const valor = valores[campo];
      if (valor && valor.length > maximo) {
        errores.push(`${etiqueta}: hasta ${maximo} caracteres`);
      }
    }
    if (valores.email && !esEmail.safeParse(valores.email).success) {
      errores.push(`Email: "${valores.email}" no es un email valido`);
    }

    const activo = leerSiNo(fila.activo);
    if (activo === null) {
      errores.push(`Activo: "${fila.activo?.trim()}" tiene que ser Si o No`);
    }

    const repetido = (tipo: keyof typeof vistos, clave: string, enBase: string, enArchivo: string) => {
      const fila = vistos[tipo].get(clave);
      if (existentes[tipo].has(clave)) {
        errores.push(enBase);
      } else if (fila !== undefined) {
        errores.push(`${enArchivo} (fila ${fila})`);
      } else {
        vistos[tipo].set(clave, numero);
      }
    };

    if (valores.email) {
      repetido("emails", claveEmail(valores.email), "Email: ya hay un cliente con ese email", "Email: repetido");
    }
    if (valores.documento && claveDocumento(valores.documento)) {
      repetido("documentos", claveDocumento(valores.documento), "Documento: ya hay un cliente con ese documento", "Documento: repetido");
    }
    if (valores.nombre && valores.telefono && valores.telefono.replace(/\D/g, "")) {
      repetido(
        "personas",
        clavePersona(valores.nombre, valores.apellido, valores.telefono),
        "Ya hay un cliente con el mismo nombre, apellido y telefono",
        "Mismo nombre, apellido y telefono que otra fila"
      );
    }

    const cliente: ClienteImportable | null =
      errores.length === 0 && valores.nombre
        ? {
            nombre: valores.nombre,
            apellido: valores.apellido,
            documento: valores.documento,
            telefono: valores.telefono,
            email: valores.email,
            instagram: valores.instagram,
            domicilio: valores.domicilio,
            localidad: valores.localidad,
            provincia: valores.provincia,
            observaciones: valores.observaciones,
            activo: activo ?? true
          }
        : null;

    return { numero, errores, cliente };
  });

  const conErrores = validadas.filter((fila) => fila.errores.length > 0).length;

  return {
    filas: validadas,
    resumen: { total: validadas.length, validas: validadas.length - conErrores, conErrores }
  };
}
