import { Prisma, PrismaClient } from "@prisma/client";

import { AccionAuditoria, EntidadAuditada } from "../../compartido/dominio/enums";

import { auditoriaRepository, CambioAuditado } from "./auditoria.repository";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;
type Registro = Record<string, unknown>;

const CAMPOS_PRECIO = ["precio", "costo"] as const;

// Valores comparables y guardables como texto: Decimal "1000.5", BigInt "7", fechas en ISO.
// Vacio y null son lo mismo: si no, guardar un formulario con un campo opcional vacio parece un cambio.
export function valorAuditable(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (Prisma.Decimal.isDecimal(valor)) {
    return (valor as Prisma.Decimal).toString();
  }

  return String(valor);
}

export function calcularCambios(antes: Registro | null, despues: Registro, campos: readonly string[]): CambioAuditado[] {
  return campos
    .map((campo) => ({
      campo,
      antes: antes ? valorAuditable(antes[campo]) : null,
      despues: valorAuditable(despues[campo])
    }))
    .filter((cambio) => cambio.antes !== cambio.despues);
}

// Si solo cambio "activo" es una activacion o desactivacion; cualquier otra cosa, modificacion.
export function accionDeModificacion(cambios: CambioAuditado[]): AccionAuditoria {
  if (cambios.length === 1 && cambios[0].campo === "activo") {
    return cambios[0].despues === "true" ? "ACTIVACION" : "DESACTIVACION";
  }

  return "MODIFICACION";
}

type Contexto = { entidad: EntidadAuditada; idEntidad: bigint; idUsuario?: bigint; campos: readonly string[] };

export const auditoriaService = {
  // Se llaman dentro de la transaccion del cambio: si el cambio falla, no queda registro, y viceversa.
  async registrarAlta(db: PrismaOrTx, contexto: Contexto, registro: Registro) {
    const cambios = calcularCambios(null, registro, contexto.campos);

    await auditoriaRepository.registrar(db, {
      entidad: contexto.entidad,
      idEntidad: contexto.idEntidad,
      accion: "ALTA",
      cambios,
      idUsuario: contexto.idUsuario
    });
  },

  // Altas de muchos registros de la misma entidad en una consulta (importaciones).
  async registrarAltas(
    db: PrismaOrTx,
    contexto: Omit<Contexto, "idEntidad">,
    registros: Array<{ idEntidad: bigint; registro: Registro }>
  ) {
    await auditoriaRepository.registrarVarios(
      db,
      registros.map(({ idEntidad, registro }) => ({
        entidad: contexto.entidad,
        idEntidad,
        accion: "ALTA" as const,
        cambios: calcularCambios(null, registro, contexto.campos),
        idUsuario: contexto.idUsuario
      }))
    );
  },

  async registrarModificacion(db: PrismaOrTx, contexto: Contexto, antes: Registro, despues: Registro) {
    const cambios = calcularCambios(antes, despues, contexto.campos);

    // Guardar sin cambios reales (mismo valor) no deja registro.
    if (cambios.length === 0) {
      return;
    }

    await auditoriaRepository.registrar(db, {
      entidad: contexto.entidad,
      idEntidad: contexto.idEntidad,
      accion: accionDeModificacion(cambios),
      cambios,
      idUsuario: contexto.idUsuario
    });
  },

  listar(filtros: { entidad: EntidadAuditada; idEntidad: bigint; limit: number; offset: number }) {
    return auditoriaRepository.listar(filtros);
  },

  // Linea de tiempo de precio y costo de un item: un punto por registro que cambio alguno de los
  // dos, con el valor anterior y el nuevo. Los demas campos del mismo registro no se muestran.
  async listarPrecios(filtros: { idItemCatalogo: bigint; limit: number; offset: number }) {
    const registros = await auditoriaRepository.listarConCampos({
      entidad: "ITEM_CATALOGO",
      idEntidad: filtros.idItemCatalogo,
      campos: CAMPOS_PRECIO,
      limit: filtros.limit,
      offset: filtros.offset
    });

    return registros.map((registro) => {
      const cambios = registro.cambios as CambioAuditado[];
      const buscar = (campo: string) => {
        const cambio = cambios.find((actual) => actual.campo === campo);
        return cambio ? { antes: cambio.antes, despues: cambio.despues } : null;
      };

      return {
        idAuditoriaCambio: registro.idAuditoriaCambio,
        fecha: registro.fecha,
        accion: registro.accion,
        usuario: registro.usuario,
        precio: buscar("precio"),
        costo: buscar("costo")
      };
    });
  }
};
