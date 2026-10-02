"use client";

import { useEffect, useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { actualizarConfiguracion, obtenerConfiguracion } from "../../../src/lib/modulos/configuracion";
import { Configuracion, OpcionDevolucionStock } from "../../../src/types/configuracion";

export default function ConfiguracionPage() {
  const usuario = useUsuarioAutenticado();

  if (!usuario.esAdministrador) {
    return (
      <section className="modulo-panel">
        <EstadoVacio descripcion="La configuracion esta disponible solo para administradores." titulo="Sin acceso" />
      </section>
    );
  }

  return <FormularioConfiguracion />;
}

type Valores = Omit<Configuracion, "guardada">;

// Una accion de cancelacion: preguntar en el momento, devolver siempre o no devolver nunca.
function Accion({
  id,
  titulo,
  explicacion,
  opcion,
  onCambiar
}: {
  id: string;
  titulo: string;
  explicacion: string;
  opcion: OpcionDevolucionStock;
  onCambiar: (opcion: OpcionDevolucionStock) => void;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="tarjeta-seccion">
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      <p className="texto-secundario">{explicacion}</p>
      <label className="campo-formulario" htmlFor={`${id}-opcion`}>
        <span>Al cancelar</span>
        <select
          id={`${id}-opcion`}
          onChange={(event) => onCambiar(event.target.value as OpcionDevolucionStock)}
          value={opcion}
        >
          <option value="PREGUNTAR">Preguntar en el momento</option>
          <option value="DEVOLVER">Devolver al stock, sin preguntar</option>
          <option value="NO_DEVOLVER">No devolver, sin preguntar</option>
        </select>
      </label>
    </section>
  );
}

function FormularioConfiguracion() {
  const [valores, setValores] = useState<Valores | null>(null);
  const [guardada, setGuardada] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerConfiguracion()
      .then(({ guardada: enLaBase, ...leidos }) => {
        setValores(leidos);
        setGuardada(enLaBase);
      })
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No fue posible cargar la configuracion")
      );
  }, []);

  function cambiar(cambios: Partial<Valores>) {
    setValores((actuales) => (actuales ? { ...actuales, ...cambios } : actuales));
    setExito(null);
  }

  async function guardar() {
    if (!valores) {
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const { guardada: enLaBase, ...guardados } = await actualizarConfiguracion(valores);
      setValores(guardados);
      setGuardada(enLaBase);
      setExito("Configuracion guardada.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible guardar la configuracion");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        descripcion="Que hacer con el stock al cancelar algo que ya lo desconto: preguntar en el momento, o devolverlo o no devolverlo siempre, sin preguntar."
        titulo="Configuracion"
      />
      {error ? <MensajeError mensaje={error} /> : null}
      {exito ? <MensajeExito mensaje={exito} /> : null}
      {!guardada ? (
        <p className="texto-secundario">
          Esta base todavia no tiene la configuracion (falta migrar): al cancelar no se devuelve el stock.
        </p>
      ) : null}
      {!valores ? (
        error ? null : <EstadoCargando />
      ) : (
        <>
          <Accion
            explicacion="Un pedido confirmado, en preparacion o listo ya desconto sus productos del stock."
            id="config-pedido"
            onCambiar={(opcion) => cambiar({ cancelarPedido: opcion })}
            opcion={valores.cancelarPedido}
            titulo="Cancelar un pedido confirmado"
          />
          <Accion
            explicacion="Una orden en proceso ya desconto los insumos de su receta al iniciarse."
            id="config-orden"
            onCambiar={(opcion) => cambiar({ cancelarOrden: opcion })}
            opcion={valores.cancelarOrden}
            titulo="Cancelar una orden en proceso"
          />
          <div className="acciones-formulario">
            <button className="boton-primario" disabled={guardando || !guardada} onClick={() => void guardar()} type="button">
              {guardando ? "Guardando..." : "Guardar configuracion"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
