import { TipoItem } from "../../compartido/dominio/enums";

import { FilaImportacion } from "./importacion-catalogo.schemas";

export type ItemImportable = {
  nombre: string;
  slug: string;
  tipoItem: TipoItem;
  categoria: string;
  codigo?: string;
  precio?: number;
  costo?: number;
  stockMinimo: number;
  tipoMaterial?: string;
  color?: string;
  descripcionCorta?: string;
  activo: boolean;
};

export type FilaValidada = {
  // Numero de fila del archivo: la 1 es el encabezado, la primera de datos es la 2.
  numero: number;
  errores: string[];
  item: ItemImportable | null;
};

// Lo que ya existe en la base, para detectar duplicados antes de crear.
export type Existentes = {
  slugsItems: Set<string>;
  codigosItems: Set<string>;
  // nombre de categoria en minusculas -> existe
  categorias: Set<string>;
};

// "Maceta Grande Ñandú" -> "maceta-grande-nandu"
export function generarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function texto(valor: string | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? undefined : limpio;
}

// Acepta "1234.5", "1234,5" y "1.234,50" (formato argentino). Devuelve null si no es un numero.
export function leerNumero(valor: string) {
  const sinEspacios = valor.replace(/\s|\$/g, "");
  const normalizado = sinEspacios.includes(",") ? sinEspacios.replace(/\./g, "").replace(",", ".") : sinEspacios;
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
    return null;
  }
  return Number(normalizado);
}

const TIPOS: Record<string, TipoItem> = { producto: "PRODUCTO", insumo: "INSUMO" };
const SI = new Set(["si", "sí", "s", "true", "1", "activo", "x"]);
const NO = new Set(["no", "n", "false", "0", "inactivo"]);

function validarLargo(errores: string[], campo: string, valor: string | undefined, maximo: number) {
  if (valor && valor.length > maximo) {
    errores.push(`${campo}: hasta ${maximo} caracteres`);
  }
}

// Valida y convierte las filas del CSV. No toca la base: recibe lo que ya existe. Una fila con
// errores no se importa y, como la importacion es todo o nada, frena el archivo entero.
export function validarFilas(filas: FilaImportacion[], existentes: Existentes) {
  const slugsDelArchivo = new Map<string, number>();
  const codigosDelArchivo = new Map<string, number>();
  const categoriasNuevas = new Map<string, string>();

  const validadas: FilaValidada[] = filas.map((fila, indice) => {
    const numero = indice + 2;
    const errores: string[] = [];

    const nombre = texto(fila.nombre);
    const categoria = texto(fila.categoria);
    const codigo = texto(fila.codigo);
    const tipoTexto = texto(fila.tipo)?.toLowerCase();
    const tipoItem = tipoTexto ? TIPOS[tipoTexto] : undefined;

    if (!nombre) {
      errores.push("Nombre: es obligatorio");
    }
    validarLargo(errores, "Nombre", nombre, 150);

    if (!tipoTexto) {
      errores.push("Tipo: es obligatorio (Producto o Insumo)");
    } else if (!tipoItem) {
      errores.push(`Tipo: "${fila.tipo?.trim()}" no es Producto ni Insumo`);
    }

    if (!categoria) {
      errores.push("Categoria: es obligatoria");
    }
    validarLargo(errores, "Categoria", categoria, 120);
    validarLargo(errores, "Codigo", codigo, 80);
    validarLargo(errores, "Material", texto(fila.material), 100);
    validarLargo(errores, "Color", texto(fila.color), 100);
    validarLargo(errores, "Descripcion corta", texto(fila.descripcionCorta), 300);

    const numeros: Partial<Record<"precio" | "costo" | "stockMinimo", number>> = {};
    for (const [campo, etiqueta] of [
      ["precio", "Precio"],
      ["costo", "Costo"],
      ["stockMinimo", "Stock minimo"]
    ] as const) {
      const valor = texto(fila[campo]);
      if (valor === undefined) {
        continue;
      }
      const numero = leerNumero(valor);
      if (numero === null || numero < 0) {
        errores.push(`${etiqueta}: "${valor}" no es un numero valido`);
      } else if (campo === "stockMinimo" && !Number.isInteger(numero)) {
        errores.push(`${etiqueta}: tiene que ser un numero entero`);
      } else {
        numeros[campo] = numero;
      }
    }

    const activoTexto = texto(fila.activo)?.toLowerCase();
    let activo = true;
    if (activoTexto !== undefined) {
      if (SI.has(activoTexto)) {
        activo = true;
      } else if (NO.has(activoTexto)) {
        activo = false;
      } else {
        errores.push(`Activo: "${fila.activo?.trim()}" tiene que ser Si o No`);
      }
    }

    const slug = nombre ? generarSlug(nombre) : "";
    if (nombre && !slug) {
      errores.push("Nombre: tiene que tener letras o numeros");
    }
    if (slug) {
      const repetida = slugsDelArchivo.get(slug);
      if (existentes.slugsItems.has(slug)) {
        errores.push("Nombre: ya existe un item con ese nombre en el catalogo");
      } else if (repetida !== undefined) {
        errores.push(`Nombre: repetido en la fila ${repetida}`);
      } else {
        slugsDelArchivo.set(slug, numero);
      }
    }
    if (codigo) {
      const clave = codigo.toLowerCase();
      const repetida = codigosDelArchivo.get(clave);
      if (existentes.codigosItems.has(clave)) {
        errores.push("Codigo: ya lo usa otro item del catalogo");
      } else if (repetida !== undefined) {
        errores.push(`Codigo: repetido en la fila ${repetida}`);
      } else {
        codigosDelArchivo.set(clave, numero);
      }
    }

    if (categoria && !existentes.categorias.has(categoria.toLowerCase())) {
      categoriasNuevas.set(categoria.toLowerCase(), categoriasNuevas.get(categoria.toLowerCase()) ?? categoria);
    }

    const item: ItemImportable | null =
      errores.length === 0 && nombre && tipoItem && categoria
        ? {
            nombre,
            slug,
            tipoItem,
            categoria,
            codigo,
            precio: numeros.precio,
            costo: numeros.costo,
            stockMinimo: numeros.stockMinimo ?? 0,
            tipoMaterial: texto(fila.material),
            color: texto(fila.color),
            descripcionCorta: texto(fila.descripcionCorta),
            activo
          }
        : null;

    return { numero, errores, item };
  });

  const conErrores = validadas.filter((fila) => fila.errores.length > 0).length;

  return {
    filas: validadas,
    resumen: {
      total: validadas.length,
      validas: validadas.length - conErrores,
      conErrores,
      categoriasNuevas: [...categoriasNuevas.values()]
    }
  };
}
