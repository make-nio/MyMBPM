"use client";

import { useEffect, useState } from "react";

import { obtenerConfiguracion } from "../lib/modulos/configuracion";
import { Configuracion } from "../types/configuracion";

export type AccionCancelacion = "cancelarPedido" | "cancelarOrden";

// Que hacer con el stock al cancelar (issue #89): lee la configuracion cuando hace falta
// (activo) y guarda lo que elige quien cancela, arrancando por el "por defecto". En modo
// AUTOMATICO no se manda nada: decide la API con la configuracion.
export function useDevolucionStock(accion: AccionCancelacion, activo: boolean) {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [devolver, setDevolver] = useState(true);

  useEffect(() => {
    if (!activo || configuracion) {
      return;
    }

    let vigente = true;
    obtenerConfiguracion()
      .then((leida) => {
        if (!vigente) {
          return;
        }
        setConfiguracion(leida);
        setDevolver(accion === "cancelarPedido" ? leida.cancelarPedidoDevolver : leida.cancelarOrdenDevolver);
      })
      // Sin configuracion no se pregunta: si la API la exige, su 400 se muestra al guardar.
      .catch(() => undefined);

    return () => {
      vigente = false;
    };
  }, [accion, activo, configuracion]);

  const modo = configuracion
    ? accion === "cancelarPedido"
      ? configuracion.cancelarPedidoModo
      : configuracion.cancelarOrdenModo
    : null;

  return {
    modo,
    devolver,
    setDevolver,
    // Lo que se agrega al cuerpo del cambio de estado.
    eleccion: modo === "PREGUNTAR" ? devolver : undefined
  };
}
