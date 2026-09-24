"use client";

import { useEffect } from "react";

import { cuandoEsteLibre } from "../lib/cuando-este-libre";

// Baja en segundo plano, cuando el navegador queda libre, el codigo de lo que se carga con
// next/dynamic (por ejemplo el formulario de un modal). Asi no entra en el JS inicial de la
// pantalla, pero al abrir el modal ya esta y el foco va directo al primer campo.
export function usePrecargar(...cargas: Array<() => Promise<unknown>>) {
  useEffect(() => {
    return cuandoEsteLibre(() => {
      for (const cargar of cargas) {
        // Si falla (sin red), next/dynamic lo vuelve a pedir al abrir el modal.
        cargar().catch(() => undefined);
      }
    });
    // Solo al montar: las cargas son imports fijos.
  }, []);
}
