type MensajeExitoProps = {
  mensaje: string;
};

export function MensajeExito({ mensaje }: MensajeExitoProps) {
  return (
    <div className="mensaje-exito" role="status">
      {mensaje}
    </div>
  );
}
