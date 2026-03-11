type MensajeErrorProps = {
  mensaje: string;
};

export function MensajeError({ mensaje }: MensajeErrorProps) {
  return <div className="mensaje-error">{mensaje}</div>;
}
