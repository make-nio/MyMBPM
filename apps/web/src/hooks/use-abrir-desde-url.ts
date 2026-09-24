"use client";

import { useEffect, useRef } from "react";

// Abre una ficha si la direccion trae su id (/clientes?cliente=12): la usan la busqueda global y
// los enlaces entre pantallas. Se lee al montar porque la web es un export estatico.
export function useAbrirDesdeUrl<T>(parametro: string, cargar: (id: string) => Promise<T>, abrir: (valor: T) => void) {
  const acciones = useRef({ cargar, abrir });
  acciones.current = { cargar, abrir };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get(parametro);

    if (!id || !/^\d+$/.test(id)) {
      return;
    }

    acciones.current
      .cargar(id)
      .then((valor) => acciones.current.abrir(valor))
      .catch(() => undefined);
  }, [parametro]);
}
