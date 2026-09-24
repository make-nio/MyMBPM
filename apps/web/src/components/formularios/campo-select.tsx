import { atributosError, ErrorCampo } from "./error-campo";

type OpcionSelect = {
  value: string;
  label: string;
};

type CampoSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OpcionSelect[];
  error?: string | null;
};

export function CampoSelect({
  id,
  label,
  value,
  onChange,
  options,
  error
}: CampoSelectProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <select
        {...atributosError(id, error)}
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}
