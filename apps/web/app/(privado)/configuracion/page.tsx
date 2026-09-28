"use client";

import { useEffect, useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { actualizarConfiguracion, obtenerConfiguracion } from "../../../src/lib/modulos/configuracion";
import { Configuracion, ModoDevolucionStock } from "../../../src/types/configuracion";

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

// Una accion de cancelacion: el modo (automatico o preguntar) y que se hace por defecto.
function Accion({
  id,
  titulo,
  explicacion,
  modo,
  devolver,
  onModo,
  onDevolver
}: {
  id: string;
  titulo: string;
  explicacion: string;
  modo: ModoDevolucionStock;
  devolver: boolean;
  onModo: (modo: ModoDevolucionStock) => void;
  onDevolver: (devolver: boolean) => void;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="tarjeta-seccion">
      <h2 id={`${id}-titulo`}>{titulo}</h2>
      <p className="texto-secundario">{explicacion}</p>
      <div className="filtros-inline">
        <label className="campo-formulario" htmlFor={`${id}-modo`}>
          <span>Al cancelar</span>
          <select id={`${id}-modo`} onChange={(event) => onModo(event.target.value as ModoDevolucionStock)} value={modo}>
            <option value="PREGUNTAR">Preguntar cada vez</option>
            <option value="AUTOMATICO">Hacerlo automaticamente</option>
          </select>
        </label>
        <label className="campo-formulario" htmlFor={`${id}-devolver`}>
          <span>{modo === "PREGUNTAR" ? "Opcion marcada al preguntar" : "Que se hace"}</span>
          <select id={`${id}-devolver`} onChange={(event) => onDevolver(event.target.value === "si")} value={devolver ? "si" : "no"}>
            <option value="si">Devolver al stock</option>
            <option value="no">No devolver</option>
          </select>
        </label>
      </div>
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
        descripcion="Que hacer con el stock al cancelar algo que ya lo desconto. En modo automatico se aplica sin preguntar; si no, quien cancela elige, con la opcion de abajo ya marcada."
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
            devolver={valores.cancelarPedidoDevolver}
            explicacion="Un pedido confirmado, en preparacion o listo ya desconto sus productos del stock."
            id="config-pedido"
            modo={valores.cancelarPedidoModo}
            onDevolver={(devolver) => cambiar({ cancelarPedidoDevolver: devolver })}
            onModo={(modo) => cambiar({ cancelarPedidoModo: modo })}
            titulo="Cancelar un pedido confirmado"
          />
          <Accion
            devolver={valores.cancelarOrdenDevolver}
            explicacion="Una orden en proceso ya desconto los insumos de su receta al iniciarse."
            id="config-orden"
            modo={valores.cancelarOrdenModo}
            onDevolver={(devolver) => cambiar({ cancelarOrdenDevolver: devolver })}
            onModo={(modo) => cambiar({ cancelarOrdenModo: modo })}
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
