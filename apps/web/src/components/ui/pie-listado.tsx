type PieListadoProps = {
  cantidad: number;
  hayMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
};

// Aviso de que la tabla no muestra todo, con el boton para traer la pagina siguiente.
export function PieListado({ cantidad, hayMas, cargandoMas, onCargarMas }: PieListadoProps) {
  if (!hayMas) {
    return null;
  }

  return (
    <div aria-live="polite" className="pie-listado" role="status">
      <p>Se muestran los primeros {cantidad}. Hay mas resultados: carga mas o afina la busqueda.</p>
      <button className="boton-secundario" disabled={cargandoMas} onClick={onCargarMas} type="button">
        {cargandoMas ? "Cargando..." : "Cargar mas"}
      </button>
    </div>
  );
}
