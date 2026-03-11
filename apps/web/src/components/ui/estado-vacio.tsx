type EstadoVacioProps = {
  titulo: string;
  descripcion: string;
};

export function EstadoVacio({ titulo, descripcion }: EstadoVacioProps) {
  return (
    <div className="bloque-estado">
      <p className="marca-pequena">Sin resultados</p>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
    </div>
  );
}
