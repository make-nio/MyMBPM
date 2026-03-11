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
};

export function CampoSelect({
  id,
  label,
  value,
  onChange,
  options
}: CampoSelectProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <select
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
    </div>
  );
}
