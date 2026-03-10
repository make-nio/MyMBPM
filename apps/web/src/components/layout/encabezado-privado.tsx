import { UsuarioAutenticado } from "../../types/auth";

type EncabezadoPrivadoProps = {
  usuario: UsuarioAutenticado;
  onLogout: () => void;
};

export function EncabezadoPrivado({
  usuario,
  onLogout
}: EncabezadoPrivadoProps) {
  return (
    <header className="encabezado-privado">
      <div>
        <p className="marca-pequena">Operacion interna</p>
        <h2>Panel administrativo</h2>
        <p>
          Base privada conectada al backend para empezar a gestionar el negocio.
        </p>
      </div>

      <div className="encabezado-privado__usuario">
        <span className="encabezado-privado__chip">
          {usuario.nombre} {usuario.apellido ?? ""}
        </span>
        <button className="boton-secundario" onClick={onLogout} type="button">
          Cerrar sesion
        </button>
      </div>
    </header>
  );
}
