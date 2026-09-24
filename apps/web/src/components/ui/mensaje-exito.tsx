import { ReactNode } from "react";

type MensajeExitoProps = {
  mensaje: ReactNode;
};

export function MensajeExito({ mensaje }: MensajeExitoProps) {
  return (
    <div className="mensaje-exito" role="status">
      {mensaje}
    </div>
  );
}
