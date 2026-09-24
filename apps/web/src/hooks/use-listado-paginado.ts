"use client";

import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

import { CargarFilas, cargarHasta, cargarPagina } from "../lib/paginacion";

// Listado de a paginas: la primera se carga cuando cambian las dependencias (los filtros),
// "cargarMas" agrega la siguiente y "recargar" vuelve a traer todo lo que ya se veia.
export function useListadoPaginado<T>(cargar: CargarFilas<T>, dependencias: DependencyList, mensajeError: string) {
  const [items, setItems] = useState<T[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La funcion cambia en cada render; se usa siempre la ultima. La version descarta respuestas
  // de filtros que ya no estan aplicados.
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const version = useRef(0);
  const cantidad = useRef(0);

  function aplicar(pagina: { items: T[]; hayMas: boolean }) {
    cantidad.current = pagina.items.length;
    setItems(pagina.items);
    setHayMas(pagina.hayMas);
  }

  function describir(currentError: unknown) {
    return currentError instanceof Error ? currentError.message : mensajeError;
  }

  useEffect(() => {
    const actual = ++version.current;
    setCargando(true);
    setError(null);

    cargarPagina(cargarRef.current, 0)
      .then((pagina) => {
        if (actual === version.current) {
          aplicar(pagina);
        }
      })
      .catch((currentError: unknown) => {
        if (actual === version.current) {
          setError(describir(currentError));
        }
      })
      .finally(() => {
        if (actual === version.current) {
          setCargando(false);
        }
      });
  }, dependencias);

  const cargarMas = useCallback(async () => {
    const actual = version.current;
    setCargandoMas(true);
    setError(null);

    try {
      const pagina = await cargarPagina(cargarRef.current, cantidad.current);

      if (actual === version.current) {
        cantidad.current += pagina.items.length;
        setItems((anteriores) => [...anteriores, ...pagina.items]);
        setHayMas(pagina.hayMas);
      }
    } catch (currentError) {
      setError(describir(currentError));
    } finally {
      setCargandoMas(false);
    }
  }, []);

  const recargar = useCallback(async () => {
    // Reemplaza a cualquier carga en curso (que ya no va a apagar "cargando"): la apaga esta.
    const actual = ++version.current;

    try {
      const pagina = await cargarHasta(cargarRef.current, cantidad.current);

      if (actual === version.current) {
        aplicar(pagina);
        setError(null);
      }

      return pagina.items;
    } finally {
      if (actual === version.current) {
        setCargando(false);
      }
    }
  }, []);

  return { items, hayMas, cargando, cargandoMas, error, cargarMas, recargar };
}
