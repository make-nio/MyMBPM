import { ErrorApi } from "./api";

// Validacion de formularios antes de mandarlos a la API. Cada regla devuelve el mensaje que se
// muestra junto al campo: tiene que decir que esta mal y como se arregla. Las reglas repiten las
// de los schemas de la API (apps/api/src/modulos/<modulo>/<modulo>.schemas.ts): si cambia un
// limite alla, cambia aca.

export type ErroresCampos = Partial<Record<string, string>>;

export type Regla = (valor: string) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requerido(queFalta: string): Regla {
  return (valor) => (valor.trim() ? null : `Falta ${queFalta}: completalo para poder guardar.`);
}

export function largoMaximo(maximo: number): Regla {
  return (valor) =>
    valor.length > maximo
      ? `Tiene ${valor.length} caracteres y el maximo es ${maximo}: acortalo.`
      : null;
}

export function largoMinimo(minimo: number, que = "Tiene que tener"): Regla {
  return (valor) =>
    valor && valor.length < minimo
      ? `${que} al menos ${minimo} caracteres (tiene ${valor.length}): agrega los que faltan.`
      : null;
}

export function formatoEmail(): Regla {
  return (valor) =>
    valor && !EMAIL.test(valor.trim())
      ? "No parece un email: tiene que tener la forma nombre@dominio.com."
      : null;
}

// Un campo vacio lo resuelve requerido(); estas solo miran lo que se escribio.
export function numeroMayorACero(): Regla {
  return (valor) => {
    if (!valor.trim()) {
      return null;
    }
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      return "No es un numero: escribi solo cifras, con punto para los decimales.";
    }
    return numero > 0 ? null : "Tiene que ser mayor a cero: escribi una cantidad positiva.";
  };
}

export function numeroNoNegativo(): Regla {
  return (valor) => {
    if (!valor.trim()) {
      return null;
    }
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      return "No es un numero: escribi solo cifras, con punto para los decimales.";
    }
    return numero >= 0 ? null : "No puede ser negativo: escribi 0 o un numero mayor.";
  };
}

export function numeroEntero(): Regla {
  return (valor) =>
    valor.trim() && Number.isFinite(Number(valor)) && !Number.isInteger(Number(valor))
      ? "Tiene que ser un numero entero, sin decimales."
      : null;
}

export function igualA(otro: string, mensaje: string): Regla {
  return (valor) => (valor === otro ? null : mensaje);
}

// Aplica las reglas de cada campo y devuelve el primer error de cada uno.
export function validarCampos(campos: Record<string, { valor: string; reglas: Regla[] }>): ErroresCampos {
  const errores: ErroresCampos = {};

  for (const [id, { valor, reglas }] of Object.entries(campos)) {
    for (const regla of reglas) {
      const mensaje = regla(valor);
      if (mensaje) {
        errores[id] = mensaje;
        break;
      }
    }
  }

  return errores;
}

export function hayErrores(errores: ErroresCampos) {
  return Object.values(errores).some(Boolean);
}

export function resumenErrores(errores: ErroresCampos) {
  const cantidad = Object.values(errores).filter(Boolean).length;
  return cantidad === 1
    ? "Hay un dato para corregir: esta marcado debajo del campo."
    : `Hay ${cantidad} datos para corregir: estan marcados debajo de cada campo.`;
}

// Columna repetida de un 409 de la API (un P2002 o un duplicado que el service ya detecta), para
// mostrar el mensaje junto al campo que hay que cambiar. null si no es un duplicado de una columna.
export function columnaDuplicada(error: unknown): string | null {
  if (!(error instanceof ErrorApi) || error.status !== 409) {
    return null;
  }

  const target = (error.detalles as { target?: unknown } | null)?.target;
  return Array.isArray(target) && target.length === 1 && typeof target[0] === "string" ? target[0] : null;
}

export function idError(idCampo: string) {
  return `${idCampo}-error`;
}

// Primer control del formulario (en el orden del documento) que tiene error.
export function primerCampoConError(formulario: HTMLFormElement | null, errores: ErroresCampos) {
  if (!formulario) {
    return null;
  }

  return (
    Array.from(formulario.elements).find(
      (elemento): elemento is HTMLElement => elemento instanceof HTMLElement && Boolean(errores[elemento.id])
    ) ?? null
  );
}
