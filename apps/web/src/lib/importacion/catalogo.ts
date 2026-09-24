import { generarCsv } from "../csv";
import { FilaImportacionCatalogo } from "../../types/importacion-catalogo";
import { ColumnaImportacion, mapearFilas } from "./columnas";

// Columnas de la plantilla (ver ColumnaImportacion).
export const COLUMNAS_CATALOGO: Array<ColumnaImportacion<keyof FilaImportacionCatalogo>> = [
  { clave: "nombre", nombre: "Nombre", obligatoria: true },
  { clave: "tipo", nombre: "Tipo", obligatoria: true },
  { clave: "categoria", nombre: "Categoria", obligatoria: true },
  { clave: "codigo", nombre: "Codigo" },
  { clave: "precio", nombre: "Precio" },
  { clave: "costo", nombre: "Costo" },
  { clave: "stockMinimo", nombre: "Stock minimo" },
  { clave: "material", nombre: "Material" },
  { clave: "color", nombre: "Color" },
  { clave: "descripcionCorta", nombre: "Descripcion corta" },
  { clave: "activo", nombre: "Activo" }
];

export function plantillaCatalogo() {
  return generarCsv(
    COLUMNAS_CATALOGO.map((columna) => columna.nombre),
    [
      ["Maceta cubo 10 cm", "Producto", "Macetas", "MAC-10", "3500", "1200", "5", "PLA", "Blanco", "Maceta con desague", "Si"],
      ["Filamento PLA 1 kg", "Insumo", "Filamentos", "PLA-1KG", "", "18000", "2", "PLA", "Negro", "", "Si"]
    ]
  );
}

// Pasa la tabla del CSV (con encabezado) a las filas que espera la API.
export function mapearFilasCatalogo(tabla: string[][]) {
  return mapearFilas(tabla, COLUMNAS_CATALOGO);
}
