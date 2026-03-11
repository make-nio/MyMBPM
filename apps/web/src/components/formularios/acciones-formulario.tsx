type AccionesFormularioProps = {
  enviando: boolean;
  onCancel: () => void;
  textoGuardar?: string;
};

export function AccionesFormulario({
  enviando,
  onCancel,
  textoGuardar = "Guardar"
}: AccionesFormularioProps) {
  return (
    <div className="acciones-formulario">
      <button className="boton-secundario" onClick={onCancel} type="button">
        Cancelar
      </button>
      <button className="boton-primario" disabled={enviando} type="submit">
        {enviando ? "Guardando..." : textoGuardar}
      </button>
    </div>
  );
}
