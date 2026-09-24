import { atributosError, ErrorCampo } from "./error-campo";

type CampoTextoProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number" | "password" | "date";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  step?: string;
  error?: string | null;
};

export function CampoTexto({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  autoComplete,
  minLength,
  step,
  error
}: CampoTextoProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <input
        {...atributosError(id, error)}
        autoComplete={autoComplete}
        id={id}
        minLength={minLength}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}
