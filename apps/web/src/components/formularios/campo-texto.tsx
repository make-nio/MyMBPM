type CampoTextoProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number" | "password";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
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
  minLength
}: CampoTextoProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <input
        autoComplete={autoComplete}
        id={id}
        minLength={minLength}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}
