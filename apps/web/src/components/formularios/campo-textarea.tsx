import { atributosError, ErrorCampo } from "./error-campo";

type CampoTextareaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  error?: string | null;
};

export function CampoTextarea({
  id,
  label,
  value,
  onChange,
  rows = 4,
  error
}: CampoTextareaProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <textarea
        {...atributosError(id, error)}
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}
