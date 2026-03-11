type CampoTextareaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function CampoTextarea({
  id,
  label,
  value,
  onChange,
  rows = 4
}: CampoTextareaProps) {
  return (
    <div className="campo-formulario">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}
