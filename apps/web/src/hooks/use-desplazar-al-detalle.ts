"use client";

import { useEffect, useRef } from "react";

// Cuando se elige una fila, lleva la pantalla hasta su detalle. En el celular el detalle queda
// debajo de la lista y, sin esto, elegir una fila no cambia nada de lo que se ve. Tambien le
// pasa el foco: con teclado o lector de pantalla, el siguiente Tab sigue dentro del detalle y no
// en la fila de la lista.
export function useDesplazarAlDetalle<T extends HTMLElement = HTMLDivElement>(clave: string | null) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const detalle = ref.current;

    if (clave && detalle) {
      detalle.scrollIntoView({ behavior: "smooth", block: "start" });

      if (!detalle.hasAttribute("tabindex")) {
        detalle.setAttribute("tabindex", "-1");
      }

      detalle.focus({ preventScroll: true });
    }
  }, [clave]);

  return ref;
}
