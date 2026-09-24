"use client";

import { usePathname } from "next/navigation";

import { ENCABEZADOS_MODULO } from "../../lib/encabezados-modulo";
import { EncabezadoModulo } from "../ui/encabezado-modulo";
import { EstadoCargando } from "../ui/estado-cargando";
import { BarraLateralPrivada } from "./barra-lateral-privada";
import { EncabezadoPrivado } from "./encabezado-privado";

type MarcoPrivadoProps = {
  menuAbierto: boolean;
  onAlternarMenu: () => void;
};

// Lo que se ve mientras se valida la sesion: el menu (sin las opciones de administrador), el
// encabezado sin el usuario y el titulo de la pantalla, que es texto fijo. Ningun dato: los
// listados, formularios y botones de la pantalla esperan a que la API confirme la sesion.
export function MarcoPrivado({ menuAbierto, onAlternarMenu }: MarcoPrivadoProps) {
  const pathname = usePathname();
  const encabezado = ENCABEZADOS_MODULO[pathname.replace(/\/$/, "")];

  return (
    <div className="panel-shell">
      <BarraLateralPrivada abierta={menuAbierto} esAdministrador={false} />

      <div className="contenido-privado">
        <EncabezadoPrivado menuAbierto={menuAbierto} onAlternarMenu={onAlternarMenu} onLogout={() => undefined} usuario={null} />
        <main aria-busy="true" className="contenido-principal">
          {encabezado ? (
            <section className="modulo-panel">
              <EncabezadoModulo {...encabezado} />
              <EstadoCargando titulo="Validando sesion" />
            </section>
          ) : (
            <EstadoCargando titulo="Validando sesion" />
          )}
        </main>
      </div>
    </div>
  );
}
