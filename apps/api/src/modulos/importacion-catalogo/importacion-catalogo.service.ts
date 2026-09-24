import { Prisma } from "@prisma/client";

import { ErrorConflicto } from "../../compartido/errores/error-conflicto";
import { prisma } from "../../lib/prisma";
import { auditoriaService } from "../auditoria/auditoria.service";
import { CAMPOS_AUDITADOS_ITEM } from "../items-catalogo/items-catalogo.service";

import { importacionCatalogoRepository } from "./importacion-catalogo.repository";
import { FilaImportacion } from "./importacion-catalogo.schemas";
import { generarSlug, validarFilas } from "./validar-filas";

type Db = Parameters<typeof importacionCatalogoRepository.buscarExistentes>[0];

async function validarContraBase(db: Db, filas: FilaImportacion[]) {
  const nombres = filas.map((fila) => fila.nombre?.trim() ?? "").filter(Boolean);
  const codigos = [...new Set(filas.map((fila) => fila.codigo?.trim() ?? "").filter(Boolean))];
  const categorias = [...new Set(filas.map((fila) => fila.categoria?.trim() ?? "").filter(Boolean))];
  const slugs = [...new Set(nombres.map(generarSlug).filter(Boolean))];

  const existentes = await importacionCatalogoRepository.buscarExistentes(db, slugs, codigos, categorias);
  const resultado = validarFilas(filas, {
    slugsItems: new Set(existentes.items.map((item) => item.slug)),
    codigosItems: new Set(existentes.porCodigo.map((item) => (item.codigo ?? "").toLowerCase())),
    categorias: new Set(existentes.categorias.map((categoria) => categoria.nombre.toLowerCase()))
  });

  return { ...resultado, categoriasExistentes: existentes.categorias };
}

// Slug de categoria libre: si "llaveros" ya lo usa otra categoria, "llaveros-2".
async function slugCategoriaLibre(tx: Prisma.TransactionClient, nombre: string) {
  const base = generarSlug(nombre) || "categoria";
  const candidatos = [base, ...Array.from({ length: 20 }, (_, indice) => `${base}-${indice + 2}`)];
  const usados = new Set((await importacionCatalogoRepository.buscarCategoriasPorSlug(tx, candidatos)).map((c) => c.slug));
  const libre = candidatos.find((candidato) => !usados.has(candidato));

  if (!libre) {
    throw new ErrorConflicto(`No se pudo generar un identificador para la categoria "${nombre}"`);
  }

  return libre;
}

export const importacionCatalogoService = {
  // Lo que pasaria si se importa: errores por fila y categorias que se crearian. No escribe.
  async previsualizar(filas: FilaImportacion[]) {
    const { filas: validadas, resumen } = await validarContraBase(prisma, filas);
    return { filas: validadas, resumen };
  },

  // Todo o nada: se vuelve a validar dentro de la transaccion (con un lock, por si hay dos
  // importaciones a la vez) y, si alguna fila tiene errores, no se crea nada.
  importar(filas: FilaImportacion[], idUsuario?: bigint) {
    return prisma.$transaction(
      async (tx) => {
        await importacionCatalogoRepository.bloquearImportacion(tx);
        const { filas: validadas, resumen, categoriasExistentes } = await validarContraBase(tx, filas);

        if (resumen.conErrores > 0) {
          throw new ErrorConflicto(
            `Hay ${resumen.conErrores} ${resumen.conErrores === 1 ? "fila con errores" : "filas con errores"}: no se importo nada`,
            { filas: validadas.filter((fila) => fila.errores.length > 0), resumen }
          );
        }

        const idsCategoria = new Map(categoriasExistentes.map((c) => [c.nombre.toLowerCase(), c.idCategoria]));
        for (const nombre of resumen.categoriasNuevas) {
          const categoria = await importacionCatalogoRepository.crearCategoria(tx, {
            nombre,
            slug: await slugCategoriaLibre(tx, nombre)
          });
          idsCategoria.set(nombre.toLowerCase(), categoria.idCategoria);
        }

        const creados = await importacionCatalogoRepository.crearItems(
          tx,
          validadas.flatMap(({ item }) => {
            if (!item) {
              return [];
            }
            const { categoria, ...datos } = item;
            return [{ ...datos, idCategoria: idsCategoria.get(categoria.toLowerCase()) as bigint }];
          })
        );
        await auditoriaService.registrarAltas(
          tx,
          { entidad: "ITEM_CATALOGO", idUsuario, campos: CAMPOS_AUDITADOS_ITEM },
          creados.map((creado) => ({ idEntidad: creado.idItemCatalogo, registro: creado }))
        );

        return { creados: creados.length, categoriasCreadas: resumen.categoriasNuevas };
      },
      { timeout: 60_000, maxWait: 10_000 }
    );
  }
};
