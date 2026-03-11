type EstadoCargandoProps = {
  titulo?: string;
  descripcion?: string;
};

export function EstadoCargando({
  titulo = "Cargando datos",
  descripcion = "Estamos consultando la informacion del modulo."
}: EstadoCargandoProps) {
  return (
    <div className="bloque-estado">
      <p className="marca-pequena">Panel privado</p>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
    </div>
  );
}
