"use client";

import { useState } from "react";

export function useModal<T = null>() {
  const [abierto, setAbierto] = useState(false);
  const [contexto, setContexto] = useState<T | null>(null);

  function abrir(contextoInicial?: T | null) {
    setContexto(contextoInicial ?? null);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setContexto(null);
  }

  return {
    abierto,
    contexto,
    abrir,
    cerrar
  };
}
