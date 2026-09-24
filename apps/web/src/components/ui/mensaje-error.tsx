type MensajeErrorProps = {
  mensaje: string;
};

export function MensajeError({ mensaje }: MensajeErrorProps) {
  return <div className="mensaje-error" role="alert">{mensaje}</div>;
}
