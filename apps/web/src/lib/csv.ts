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
