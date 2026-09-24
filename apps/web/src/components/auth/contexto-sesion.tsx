"use client";

import { createContext, ReactNode, useContext } from "react";

import { UsuarioAutenticado } from "../../types/auth";

const ContextoSesion = createContext<UsuarioAutenticado | null>(null);

export function ProveedorSesion({
  usuario,
  children
}: {
  usuario: UsuarioAutenticado;
  children: ReactNode;
}) {
  return <ContextoSesion.Provider value={usuario}>{children}</ContextoSesion.Provider>;
}

// Usuario autenticado del panel privado. Solo se puede usar debajo del layout privado.
export function useUsuarioAutenticado() {
  const usuario = useContext(ContextoSesion);

  if (!usuario) {
    throw new Error("useUsuarioAutenticado debe usarse dentro del layout privado");
  }

  return usuario;
}
