type CampoCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function CampoCheckbox({
  id,
  label,
  checked,
  onChange
}: CampoCheckboxProps) {
  return (
    <label className="campo-checkbox" htmlFor={id}>
      <input
        checked={checked}
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
