"use client";

import { ReactNode, useEffect, useRef } from "react";

type ModalProps = {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onClose: () => void;
  children: ReactNode;
};

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function enfocables(contenedor: HTMLElement) {
  return Array.from(contenedor.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
    (elemento) => elemento.offsetParent !== null || elemento === document.activeElement
  );
}

// Dialogo modal. Con teclado: al abrir, el foco pasa al primer campo; Tab y Shift+Tab no salen
// del dialogo; Escape lo cierra; al cerrar, el foco vuelve a donde estaba (el boton que lo abrio o,
// si ya no esta, su seccion).
export function Modal({ abierto, titulo, descripcion, onClose, children }: ModalProps) {
  const refDialogo = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialogo = refDialogo.current;

    if (!abierto || !dialogo) {
      return;
    }

    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Si al cerrar el boton que lo abrio ya no esta (por ejemplo "Confirmar pedido", que desaparece
    // al confirmar), el foco vuelve a la seccion que lo contenia y no se pierde en la pagina.
    const seccion = previo?.closest<HTMLElement>("section[aria-label], [role='region']") ?? null;
    const cuerpo = dialogo.querySelector<HTMLElement>(".modal-cuerpo");
    const primerCampo = cuerpo ? enfocables(cuerpo)[0] : undefined;
    (primerCampo ?? dialogo).focus();

    function alPresionar(evento: KeyboardEvent) {
      if (!dialogo) {
        return;
      }

      if (evento.key === "Escape") {
        evento.preventDefault();
        onCloseRef.current();
        return;
      }

      if (evento.key !== "Tab") {
        return;
      }

      const lista = enfocables(dialogo);
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;

      if (!primero || !ultimo) {
        evento.preventDefault();
      } else if (evento.shiftKey && (actual === primero || actual === dialogo || !dialogo.contains(actual))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (actual === ultimo || !dialogo.contains(actual))) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPresionar);

    return () => {
      document.removeEventListener("keydown", alPresionar);

      if (previo?.isConnected) {
        previo.focus();
      } else if (seccion?.isConnected) {
        if (!seccion.hasAttribute("tabindex")) {
          seccion.setAttribute("tabindex", "-1");
        }
        seccion.focus();
      }
    };
  }, [abierto]);

  if (!abierto) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        aria-label={titulo}
        aria-modal="true"
        className="modal-contenido"
        onClick={(event) => event.stopPropagation()}
        ref={refDialogo}
        role="dialog"
        tabIndex={-1}
      >
        <div className="modal-encabezado">
          <div>
            <p className="marca-pequena">Edicion</p>
            <h3>{titulo}</h3>
            {descripcion ? <p>{descripcion}</p> : null}
          </div>

          <button className="boton-secundario" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}
