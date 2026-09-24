"use client";

import { useEffect, useRef } from "react";

// Cuando se elige una fila, lleva la pantalla hasta su detalle. En el celular el detalle queda
// debajo de la lista y, sin esto, elegir una fila no cambia nada de lo que se ve.
export function useDesplazarAlDetalle<T extends HTMLElement = HTMLDivElement>(clave: string | null) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (clave) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [clave]);

  return ref;
}
