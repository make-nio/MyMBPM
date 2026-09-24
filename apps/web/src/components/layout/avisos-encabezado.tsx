"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { listarAvisos } from "../../lib/avisos";
import { cuandoEsteLibre } from "../../lib/cuando-este-libre";
import { obtenerAvisos } from "../../lib/modulos/panel";
import { AvisosPanel } from "../../types/panel";

import { IconoCampana } from "./marcador-avisos";

// Campanita del encabezado: lo que falta reponer y las entregas atrasadas o de hoy. Se vuelve a
// consultar al cambiar de pantalla; no hay notificaciones push ni mails.
export function AvisosEncabezado() {
  const pathname = usePathname();
  const [avisos, setAvisos] = useState<AvisosPanel | null>(null);
  const [abierto, setAbierto] = useState(false);
  const refContenedor = useRef<HTMLDivElement>(null);
  const refBoton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vigente = true;
    setAbierto(false);

    // Los avisos esperan a que el navegador este libre: la pantalla carga primero sus propios
    // datos y la campanita no compite con ellos.
    const consultar = () =>
      obtenerAvisos()
        .then((datos) => vigente && setAvisos(datos))
        // Sin avisos no se rompe nada: la campanita queda sin contador.
        .catch(() => vigente && setAvisos(null));
    const cancelar = cuandoEsteLibre(consultar);

    return () => {
      vigente = false;
      cancelar();
    };
  }, [pathname]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    function alHacerClic(evento: MouseEvent) {
      if (!refContenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    function alPresionar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        refBoton.current?.focus();
      }
    }

    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  const lista = avisos ? listarAvisos(avisos) : [];
  const total = lista.reduce((suma, aviso) => suma + aviso.cantidad, 0);

  return (
    <div className="avisos-encabezado" ref={refContenedor}>
      <button
        aria-controls="avisos-encabezado-lista"
        aria-expanded={abierto}
        aria-label={total > 0 ? `Avisos: ${total}` : "Avisos: ninguno"}
        className="boton-secundario avisos-encabezado__boton"
        onClick={() => setAbierto((valor) => !valor)}
        ref={refBoton}
        type="button"
      >
        <IconoCampana />
        {/* Siempre ocupa su lugar, aunque todavia no haya avisos: si apareciera recien cuando
            responde la API, el boton se ensancharia y en el celular correria la pagina (CLS). */}
        <span aria-hidden="true" className="avisos-encabezado__contador" data-vacio={total === 0}>
          {total > 99 ? "99+" : total}
        </span>
      </button>

      {abierto ? (
        <div aria-label="Avisos" className="avisos-encabezado__panel" id="avisos-encabezado-lista" role="region">
          {avisos === null ? (
            <p className="texto-secundario texto-secundario--compacto">No fue posible cargar los avisos.</p>
          ) : lista.length === 0 ? (
            <p className="texto-secundario texto-secundario--compacto">Nada pendiente: todo al dia.</p>
          ) : (
            <ul>
              {lista.map((aviso) => (
                <li key={aviso.clave}>
                  <Link href={aviso.href} onClick={() => setAbierto(false)}>
                    <strong>{aviso.cantidad}</strong> {aviso.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
