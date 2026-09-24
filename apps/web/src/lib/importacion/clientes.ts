import { generarCsv } from "../csv";
import { FilaImportacionCliente } from "../../types/importacion-clientes";
import { ColumnaImportacion, mapearFilas } from "./columnas";

// Columnas de la plantilla de clientes (ver ColumnaImportacion). Solo el nombre es obligatorio.
export const COLUMNAS_CLIENTES: Array<ColumnaImportacion<keyof FilaImportacionCliente>> = [
  { clave: "nombre", nombre: "Nombre", obligatoria: true },
  { clave: "apellido", nombre: "Apellido" },
  { clave: "documento", nombre: "Documento" },
  { clave: "telefono", nombre: "Telefono" },
  { clave: "email", nombre: "Email" },
  { clave: "instagram", nombre: "Instagram" },
  { clave: "domicilio", nombre: "Domicilio" },
  { clave: "localidad", nombre: "Localidad" },
  { clave: "provincia", nombre: "Provincia" },
  { clave: "observaciones", nombre: "Observaciones" },
  { clave: "activo", nombre: "Activo" }
];

export function plantillaClientes() {
  return generarCsv(
    COLUMNAS_CLIENTES.map((columna) => columna.nombre),
    [
      ["Ana", "Diaz", "20123456", "11 5555-0000", "ana@ejemplo.com", "@anadiaz", "Calle 123", "Quilmes", "Buenos Aires", "Prefiere WhatsApp", "Si"],
      ["Bruno", "", "", "11 4444-0000", "", "", "", "Bernal", "Buenos Aires", "", "Si"]
    ]
  );
}

// Pasa la tabla del CSV (con encabezado) a las filas que espera la API.
export function mapearFilasClientes(tabla: string[][]) {
  return mapearFilas(tabla, COLUMNAS_CLIENTES);
}
