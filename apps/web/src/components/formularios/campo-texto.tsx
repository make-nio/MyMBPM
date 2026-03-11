type CampoTextoProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number";
  placeholder?: string;
  required?: boolean;
};

export function CampoTexto({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required
}: CampoTextoProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
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
