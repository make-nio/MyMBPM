import dynamic from "next/dynamic";

import { UsuarioAutenticado } from "../../types/auth";

import { BusquedaGlobal } from "./busqueda-global";
import { MarcadorAvisos } from "./marcador-avisos";

// La campanita no entra en el JS inicial de cada pantalla: se carga despues, con un marcador del
// mismo tamanio para que el encabezado no se corra (CLS) cuando aparece.
const AvisosEncabezado = dynamic(() => import("./avisos-encabezado").then((modulo) => modulo.AvisosEncabezado), {
  ssr: false,
  loading: () => <MarcadorAvisos />
});

type EncabezadoPrivadoProps = {
  // null mientras se valida la sesion: el encabezado se ve igual, sin el usuario ni lo que consulta
  // la API (busqueda, avisos), con los mismos lugares reservados para que nada se corra al llegar.
  usuario: UsuarioAutenticado | null;
  onLogout: () => void;
  menuAbierto: boolean;
  onAlternarMenu: () => void;
};

export function EncabezadoPrivado({
  usuario,
  onLogout,
  menuAbierto,
  onAlternarMenu
}: EncabezadoPrivadoProps) {
  return (
    <header className="encabezado-privado">
      <div className="encabezado-privado__titulo">
        <button
          aria-controls="menu-principal"
          aria-expanded={menuAbierto}
          className="boton-secundario boton-menu"
          onClick={onAlternarMenu}
          type="button"
        >
          {menuAbierto ? "Cerrar menu" : "Menu"}
        </button>
        <div>
          <p className="marca-pequena">Operacion interna</p>
          <h2>Panel administrativo</h2>
          <p className="encabezado-privado__descripcion">
            Base privada conectada al backend para empezar a gestionar el negocio.
          </p>
        </div>
      </div>

      {usuario ? (
        <div className="encabezado-privado__usuario">
          <BusquedaGlobal />
          <AvisosEncabezado />
          <span className="encabezado-privado__chip" title={`${usuario.nombre} ${usuario.apellido ?? ""}`.trim()}>
            {usuario.nombre} {usuario.apellido ?? ""}
          </span>
          <button className="boton-secundario" onClick={onLogout} type="button">
            Cerrar sesion
          </button>
        </div>
      ) : (
        <div aria-hidden="true" className="encabezado-privado__usuario encabezado-privado__usuario--validando">
          <button className="boton-secundario boton-busqueda" disabled tabIndex={-1} type="button">
            Buscar <kbd>Ctrl K</kbd>
          </button>
          <MarcadorAvisos />
          <span className="encabezado-privado__chip">&nbsp;</span>
          <button className="boton-secundario" disabled tabIndex={-1} type="button">
            Cerrar sesion
          </button>
        </div>
      )}
    </header>
  );
}
