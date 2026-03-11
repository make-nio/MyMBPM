import { ReactNode } from "react";

type EncabezadoModuloProps = {
  titulo: string;
  descripcion: string;
  botonLabel?: string;
  onCrear?: () => void;
  filtros?: ReactNode;
};

export function EncabezadoModulo({
  titulo,
  descripcion,
  botonLabel,
  onCrear,
  filtros
}: EncabezadoModuloProps) {
  return (
    <section className="encabezado-modulo">
      <div>
        <p className="marca-pequena">Panel administrativo</p>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>

      <div className="encabezado-modulo__acciones">
        {filtros ? <div className="encabezado-modulo__filtros">{filtros}</div> : null}
        {botonLabel && onCrear ? (
          <button className="boton-primario" onClick={onCrear} type="button">
            {botonLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
