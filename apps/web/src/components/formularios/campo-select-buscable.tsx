"use client";

import { useEffect, useRef, useState } from "react";

import { atributosError, ErrorCampo } from "./error-campo";

export type OpcionBuscable = {
  value: string;
  label: string;
};

type CampoSelectBuscableProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  // Busca en la API; recibe el texto y cuantas filas pedir.
  buscar: (texto: string, limit: number) => Promise<OpcionBuscable[]>;
  textoVacio: string;
  // Para editar: la opcion ya elegida, aunque no este entre los resultados de la busqueda.
  opcionInicial?: OpcionBuscable | null;
  error?: string | null;
};

export const RESULTADOS_BUSQUEDA = 20;
const ESPERA_MS = 300;

// Select cuyas opciones salen de una busqueda en la API, para listas que pueden tener cientos
// de filas (clientes, items). Sin texto muestra los mas recientes.
export function CampoSelectBuscable({
  id,
  label,
  value,
  onChange,
  buscar,
  textoVacio,
  opcionInicial = null,
  error: errorCampo
}: CampoSelectBuscableProps) {
  const [texto, setTexto] = useState("");
  const [opciones, setOpciones] = useState<OpcionBuscable[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [buscando, setBuscando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState<OpcionBuscable | null>(opcionInicial);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    let vigente = true;
    setBuscando(true);

    const espera = setTimeout(() => {
      buscarRef.current(texto.trim(), RESULTADOS_BUSQUEDA + 1)
        .then((resultado) => {
          if (vigente) {
            setOpciones(resultado.slice(0, RESULTADOS_BUSQUEDA));
            setHayMas(resultado.length > RESULTADOS_BUSQUEDA);
            setError(null);
          }
        })
        .catch((currentError: unknown) => {
          if (vigente) {
            setError(currentError instanceof Error ? currentError.message : "No fue posible buscar");
          }
        })
        .finally(() => {
          if (vigente) {
            setBuscando(false);
          }
        });
    }, texto ? ESPERA_MS : 0);

    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto]);

  const conElegida =
    elegida && elegida.value === value && !opciones.some((opcion) => opcion.value === value)
      ? [elegida, ...opciones]
      : opciones;

  function elegir(nuevoValor: string) {
    setElegida(conElegida.find((opcion) => opcion.value === nuevoValor) ?? null);
    onChange(nuevoValor);
  }

  let ayuda: string | null = null;
  if (error) {
    ayuda = error;
  } else if (buscando) {
    ayuda = "Buscando...";
  } else if (hayMas) {
    ayuda = `Se muestran los primeros ${RESULTADOS_BUSQUEDA}: escribi para encontrar el resto.`;
  } else if (texto && opciones.length === 0) {
    ayuda = "No hay coincidencias.";
  }

  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <input
        aria-label={`Buscar ${label.toLowerCase()}`}
        className="campo-buscable__busqueda"
        onChange={(event) => setTexto(event.target.value)}
        placeholder="Escribi para buscar"
        type="search"
        value={texto}
      />
      <select {...atributosError(id, errorCampo)} id={id} name={id} onChange={(event) => elegir(event.target.value)} value={value}>
        <option value="">{textoVacio}</option>
        {conElegida.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
      {ayuda ? (
        <p aria-live="polite" className="campo-buscable__ayuda">
          {ayuda}
        </p>
      ) : null}
      <ErrorCampo idCampo={id} mensaje={errorCampo} />
    </div>
  );
}
