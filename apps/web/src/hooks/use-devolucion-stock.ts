"use client";

import { useEffect, useState } from "react";

import { obtenerConfiguracion } from "../lib/modulos/configuracion";
import { Configuracion } from "../types/configuracion";

// Cancelar (#89) o la devolucion de un pedido entregado (#96): stock y reintegro.
export type AccionConfigurable = Exclude<keyof Configuracion, "guardada">;

// Que hacer con lo ya descontado o cobrado (issues #89 y #96): lee la configuracion cuando hace
// falta (activo) y, si hay que preguntar, guarda lo que elige quien lo hace (arranca en "si").
// Con DEVOLVER o NO_DEVOLVER no se manda nada: decide la API con la configuracion.
export function useDevolucionStock(accion: AccionConfigurable, activo: boolean) {
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
      })
      // Sin configuracion no se pregunta: si la API la exige, su 400 se muestra al guardar.
      .catch(() => undefined);

    return () => {
      vigente = false;
    };
  }, [accion, activo, configuracion]);

  const opcion = configuracion ? configuracion[accion] : null;

  return {
    opcion,
    devolver,
    setDevolver,
    // Lo que se agrega al cuerpo del cambio de estado.
    eleccion: opcion === "PREGUNTAR" ? devolver : undefined
  };
}
