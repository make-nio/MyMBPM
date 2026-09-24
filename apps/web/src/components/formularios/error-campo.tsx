import { idError } from "../../lib/validacion";

type ErrorCampoProps = {
  idCampo: string;
  mensaje?: string | null;
};

// Mensaje de error debajo de un campo. El control lo referencia con aria-describedby, asi el
// lector de pantalla lo lee al enfocarlo; el anuncio general lo hace el resumen del formulario.
export function ErrorCampo({ idCampo, mensaje }: ErrorCampoProps) {
  if (!mensaje) {
    return null;
  }

  return (
    <p className="campo-formulario__error" id={idError(idCampo)}>
      {mensaje}
    </p>
  );
}

// Atributos de accesibilidad del control segun tenga error o no.
export function atributosError(idCampo: string, mensaje?: string | null, describedBy?: string) {
  const ids = [describedBy, mensaje ? idError(idCampo) : undefined].filter(Boolean).join(" ");
  return {
    "aria-invalid": mensaje ? (true as const) : undefined,
    "aria-describedby": ids || undefined
  };
}
