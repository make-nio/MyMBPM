"use client";

import { ReactNode } from "react";

type ModalProps = {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({
  abierto,
  titulo,
  descripcion,
  onClose,
  children
}: ModalProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-contenido"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
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
