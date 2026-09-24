"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  columnaDuplicada,
  ErroresCampos,
  hayErrores,
  primerCampoConError,
  Regla,
  resumenErrores,
  validarCampos
} from "../lib/validacion";

type CamposAValidar = Record<string, { valor: string; reglas: Regla[] }>;

// Estado de validacion de un formulario: los errores por campo (id del control -> mensaje) y el
// resumen que va arriba. Al fallar lleva el foco al primer campo con error despues de pintarlo,
// asi el lector de pantalla lee la etiqueta junto con su mensaje (aria-describedby).
export function useValidacionFormulario() {
  const formularioRef = useRef<HTMLFormElement>(null);
  const [errores, setErrores] = useState<ErroresCampos>({});
  // Valor de cada campo cuando se valido: si la persona lo cambia, su mensaje se va.
  const [valoresValidados, setValoresValidados] = useState<Record<string, string>>({});
  const [enfocar, setEnfocar] = useState(0);

  useEffect(() => {
    // Solo cuando se pide enfocar (un intento de guardar que fallo): tipear no mueve el foco.
    if (enfocar > 0) {
      primerCampoConError(formularioRef.current, errores)?.focus();
    }
  }, [enfocar]);

  // Devuelve el resumen si hay errores (para mostrarlo arriba del formulario) o null si esta todo bien.
  const validar = useCallback((campos: CamposAValidar) => {
    const nuevos = validarCampos(campos);
    setErrores(nuevos);
    setValoresValidados(Object.fromEntries(Object.entries(campos).map(([id, campo]) => [id, campo.valor])));

    if (!hayErrores(nuevos)) {
      return null;
    }

    setEnfocar((actual) => actual + 1);
    return resumenErrores(nuevos);
  }, []);

  // Un duplicado que rechazo la API (409 con la columna) se muestra junto a su campo. Recibe, por
  // columna, el id del control y su valor actual. Devuelve el resumen, o null si el error no es de
  // ninguna de esas columnas y va entero arriba del formulario.
  const errorDelServidor = useCallback(
    (error: unknown, columnas: Record<string, { id: string; valor: string }>) => {
      const columna = columnaDuplicada(error);
      const campo = columna ? columnas[columna] : undefined;

      if (!campo || !(error instanceof Error)) {
        return null;
      }

      const nuevos = { [campo.id]: error.message };
      setErrores(nuevos);
      setValoresValidados({ [campo.id]: campo.valor });
      setEnfocar((actual) => actual + 1);
      return resumenErrores(nuevos);
    },
    []
  );

  // Mensaje de un campo, mientras siga con el valor que se valido.
  const errorDe = useCallback(
    (id: string, valorActual: string) => (valoresValidados[id] === valorActual ? errores[id] : undefined),
    [errores, valoresValidados]
  );

  return { formularioRef, validar, errorDelServidor, errorDe };
}
