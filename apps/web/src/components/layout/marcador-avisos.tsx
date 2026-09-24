// Lo que ocupa la campanita mientras se carga su codigo: el mismo boton, deshabilitado y con el
// lugar del contador reservado, para que el encabezado no cambie de tamanio al aparecer.
export function MarcadorAvisos() {
  return (
    <div className="avisos-encabezado">
      <button aria-label="Avisos: cargando" className="boton-secundario avisos-encabezado__boton" disabled type="button">
        <IconoCampana />
        <span aria-hidden="true" className="avisos-encabezado__contador" data-vacio="true">
          0
        </span>
      </button>
    </div>
  );
}

export function IconoCampana() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
