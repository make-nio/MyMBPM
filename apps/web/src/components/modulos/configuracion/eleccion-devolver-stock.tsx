import { OpcionDevolucionStock } from "../../../types/configuracion";

type EleccionDevolverStockProps = {
  id: string;
  opcion: OpcionDevolucionStock | null;
  devolver: boolean;
  onChange: (devolver: boolean) => void;
  // "los productos" (pedido) o "los insumos" (orden en proceso).
  queSeDevuelve: string;
};

// Al cancelar algo que ya desconto stock: con PREGUNTAR, quien cancela elige; con DEVOLVER o
// NO_DEVOLVER se avisa que decide la configuracion (Configuracion, administradores).
export function EleccionDevolverStock({ id, opcion, devolver, onChange, queSeDevuelve }: EleccionDevolverStockProps) {
  if (opcion === null) {
    return null;
  }

  if (opcion !== "PREGUNTAR") {
    return (
      <p className="texto-secundario" data-testid={`${id}-automatico`}>
        Segun la configuracion, {opcion === "DEVOLVER" ? "se devuelven al stock" : "no se devuelven al stock"}{" "}
        {queSeDevuelve} que se descontaron.
      </p>
    );
  }

  return (
    <fieldset className="campo-formulario" id={id}>
      <legend>¿Devolver al stock {queSeDevuelve} que se descontaron?</legend>
      <label htmlFor={`${id}-si`}>
        <input checked={devolver} id={`${id}-si`} name={id} onChange={() => onChange(true)} type="radio" /> Si, devolverlos
      </label>
      <label htmlFor={`${id}-no`}>
        <input checked={!devolver} id={`${id}-no`} name={id} onChange={() => onChange(false)} type="radio" /> No
      </label>
    </fieldset>
  );
}
