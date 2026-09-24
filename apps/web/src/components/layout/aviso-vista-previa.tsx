import { esVistaPrevia } from "../../lib/entorno";

// Franja fija arriba de todo en los deploy previews: usan la base de produccion.
export function AvisoVistaPrevia() {
  if (!esVistaPrevia()) {
    return null;
  }

  return (
    <div className="aviso-vista-previa" role="note">
      <strong>Vista previa: usa la base real.</strong> Lo que cargues, confirmes o borres aca queda en
      produccion.
    </div>
  );
}
