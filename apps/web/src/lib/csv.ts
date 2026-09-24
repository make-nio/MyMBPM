// Archivos CSV para abrir con Excel o Google Sheets en espanol: separador ";" (la coma es el
// decimal), BOM para que Excel lea UTF-8 (acentos, n) y fin de linea CRLF.

const SEPARADOR = ";";
const BOM = "﻿";
const NUMERO = /^-?\d+(,\d+)?$/;

type Celda = string | number | null | undefined;

// Una celda de texto que empieza con = + - @ Excel la toma como formula: un nombre de cliente
// cargado a proposito podria ejecutar algo al abrir el archivo. Se le antepone un apostrofo.
export function celdaCsv(valor: Celda) {
  if (valor === null || valor === undefined) {
    return "";
  }

  let texto = String(valor);

  if (/^[=+\-@\t\r]/.test(texto) && !NUMERO.test(texto)) {
    texto = `'${texto}`;
  }

  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function generarCsv(encabezados: string[], filas: Celda[][]) {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celdaCsv).join(SEPARADOR));
  return `${BOM}${lineas.join("\r\n")}\r\n`;
}

// Decimales de la API ("3001.50") con coma y sin separador de miles: Excel los toma como numero.
export function numeroCsv(valor: string | number | null | undefined) {
  return valor === null || valor === undefined ? "" : String(Number(valor)).replace(".", ",");
}

// Dia de hoy en Argentina (AAAA-MM-DD) para el nombre del archivo.
export function diaParaNombreArchivo(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(ahora);
}

export function descargarCsv(nombreArchivo: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

// Lee un CSV (el que genera Excel o Sheets): separador ";" o "," segun el encabezado, comillas
// dobles con "" adentro, saltos de linea dentro de comillas, BOM y CRLF. Descarta filas vacias.
export function leerCsv(texto: string): string[][] {
  const contenido = texto.replace(/^﻿/, "");
  const primeraLinea = contenido.split(/\r?\n/, 1)[0] ?? "";
  const separador = (primeraLinea.match(/;/g)?.length ?? 0) >= (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < contenido.length; i++) {
    const caracter = contenido[i];

    if (entreComillas) {
      if (caracter === '"' && contenido[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        celda += caracter;
      }
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      fila.push(celda);
      celda = "";
    } else if (caracter === "\n" || caracter === "\r") {
      if (caracter === "\r" && contenido[i + 1] === "\n") {
        i++;
      }
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += caracter;
    }
  }

  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  return filas.filter((cells) => cells.some((valor) => valor.trim() !== ""));
}
