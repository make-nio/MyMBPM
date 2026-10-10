"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { Modal } from "../../ui/modal";
import { TablaDatos } from "../../ui/tabla-datos";
import { useDevolucionStock } from "../../../hooks/use-devolucion-stock";
import { useModal } from "../../../hooks/use-modal";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { formatearCantidad, formatearDia, formatearEstado, formatearMoneda } from "../../../lib/formato";
import { cantidadesDevueltas, listarDevoluciones, registrarDevolucion } from "../../../lib/modulos/devoluciones";
import { listarPagos } from "../../../lib/modulos/pagos";
import { requerido } from "../../../lib/validacion";
import { OpcionDevolucionStock } from "../../../types/configuracion";
import { DevolucionesDelPedido, RegistrarDevolucionPayload } from "../../../types/devoluciones";
import { MEDIOS_PAGO, MedioPago } from "../../../types/pagos";
import { PedidoDetalle } from "../../../types/pedidos";

// Una eleccion configurable (#96): con PREGUNTAR quien registra elige; si no, se avisa que manda
// la configuracion (Configuracion, administradores).
function Eleccion({
  id,
  opcion,
  valor,
  onChange,
  pregunta,
  si,
  avisoSi,
  avisoNo
}: {
  id: string;
  opcion: OpcionDevolucionStock | null;
  valor: boolean;
  onChange: (valor: boolean) => void;
  pregunta: string;
  si: string;
  avisoSi: string;
  avisoNo: string;
}) {
  if (opcion === null) {
    return null;
  }

  if (opcion !== "PREGUNTAR") {
    return (
      <p className="texto-secundario" data-testid={`${id}-automatico`}>
        Segun la configuracion, {opcion === "DEVOLVER" ? avisoSi : avisoNo}.
      </p>
    );
  }

  return (
    <fieldset className="campo-formulario" id={id}>
      <legend>{pregunta}</legend>
      <label htmlFor={`${id}-si`}>
        <input checked={valor} id={`${id}-si`} name={id} onChange={() => onChange(true)} type="radio" /> {si}
      </label>
      <label htmlFor={`${id}-no`}>
        <input checked={!valor} id={`${id}-no`} name={id} onChange={() => onChange(false)} type="radio" /> No
      </label>
    </fieldset>
  );
}

function FormularioDevolucion({
  idPedido,
  detalles,
  devueltas,
  esAdministrador,
  onCancel,
  onSubmit
}: {
  idPedido: string;
  esAdministrador: boolean;
  detalles: PedidoDetalle[];
  devueltas: Map<string, number>;
  onCancel: () => void;
  onSubmit: (payload: RegistrarDevolucionPayload) => Promise<void>;
}) {
  const pendientes = detalles.map((detalle) => ({
    detalle,
    pendiente: Number(detalle.cantidad) - (devueltas.get(detalle.idPedidoDetalle) ?? 0)
  }));
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  // Una clave por apertura del formulario, la misma en cada reintento: la API no registra dos
  // veces la misma devolucion.
  const [claveIdempotencia] = useState(() => crypto.randomUUID());
  const [motivo, setMotivo] = useState("");
  const [cobrado, setCobrado] = useState<number | null>(null);
  const [monto, setMonto] = useState<string | null>(null);
  const [medio, setMedio] = useState<MedioPago>("EFECTIVO");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();
  const stock = useDevolucionStock("devolucionStock", true);
  const reintegro = useDevolucionStock("devolucionReintegro", true);

  useEffect(() => {
    listarPagos(idPedido)
      .then((resumen) => setCobrado(Number(resumen.cobrado)))
      .catch(() => setCobrado(0));
  }, [idPedido]);

  const valor = pendientes.reduce(
    (suma, { detalle }) => suma + (Number(cantidades[detalle.idPedidoDetalle]) || 0) * Number(detalle.precioUnitario),
    0
  );
  // Sin tocar el monto, lo devuelto (nunca mas de lo cobrado).
  const montoSugerido = Math.min(Math.round(valor * 100) / 100, cobrado ?? 0);
  // Reintegrar plata es solo de administradores: a un operador no se le ofrece (y si la
  // configuracion reintegra sola, la API responde 403 y se ve el mensaje).
  const eligeReintegro = reintegro.opcion === "PREGUNTAR" ? esAdministrador && reintegro.devolver : reintegro.opcion === "DEVOLVER";
  const reintegra = eligeReintegro && (cobrado ?? 0) > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const lineas = pendientes
      .filter(({ detalle }) => Number(cantidades[detalle.idPedidoDetalle]) > 0)
      .map(({ detalle }) => ({ idPedidoDetalle: detalle.idPedidoDetalle, cantidad: Number(cantidades[detalle.idPedidoDetalle]) }));
    const excedida = pendientes.find(
      ({ detalle, pendiente }) => Number(cantidades[detalle.idPedidoDetalle]) > pendiente
    );
    const resumen = validar({ "devolucion-motivo": { valor: motivo, reglas: [requerido("el motivo de la devolucion")] } });

    if (resumen || lineas.length === 0 || excedida) {
      setError(
        resumen ??
          (excedida
            ? `De ${excedida.detalle.nombreItemSnapshot} se pueden devolver hasta ${formatearCantidad(excedida.pendiente)}`
            : "Indica cuanto se devuelve de al menos un item")
      );
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({
        lineas,
        motivo,
        claveIdempotencia,
        ...(stock.eleccion !== undefined ? { devolverStock: stock.eleccion } : {}),
        ...(reintegro.opcion === "PREGUNTAR" ? { reintegrar: esAdministrador && reintegro.devolver } : {}),
        ...(reintegra ? { montoReintegro: Number(monto ?? montoSugerido), medioReintegro: medio } : {})
      });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible registrar la devolucion");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}
      {pendientes.map(({ detalle, pendiente }) => (
        <CampoTexto
          id={`devolucion-cantidad-${detalle.idPedidoDetalle}`}
          key={detalle.idPedidoDetalle}
          label={`${detalle.nombreItemSnapshot}: cuanto vuelve (hasta ${formatearCantidad(pendiente)})`}
          onChange={(valorCampo) => setCantidades((actuales) => ({ ...actuales, [detalle.idPedidoDetalle]: valorCampo }))}
          step="0.001"
          type="number"
          value={cantidades[detalle.idPedidoDetalle] ?? ""}
        />
      ))}
      <p className="texto-secundario texto-secundario--compacto">
        Valor devuelto: <strong data-testid="devolucion-valor">{formatearMoneda(valor)}</strong>
      </p>
      <CampoTextarea
        error={errorDe("devolucion-motivo", motivo)}
        id="devolucion-motivo"
        label="Motivo"
        onChange={setMotivo}
        rows={2}
        value={motivo}
      />
      <Eleccion
        avisoNo="lo devuelto no vuelve al stock"
        avisoSi="lo devuelto vuelve al stock"
        id="devolucion-stock"
        onChange={stock.setDevolver}
        opcion={stock.opcion}
        pregunta="¿Lo devuelto vuelve al stock?"
        si="Si, vuelve al stock"
        valor={stock.devolver}
      />
      {cobrado !== null && cobrado <= 0 ? (
        <p className="texto-secundario">Este pedido no tiene nada cobrado: no hay plata para reintegrar.</p>
      ) : !esAdministrador && reintegro.opcion !== "DEVOLVER" ? (
        <p className="texto-secundario" data-testid="devolucion-reintegro-solo-admin">
          Reintegrar la plata es solo de administradores: esta devolucion se registra sin reintegro.
        </p>
      ) : (
        <Eleccion
          avisoNo="no se reintegra la plata"
          avisoSi="se reintegra la plata"
          id="devolucion-reintegro"
          onChange={reintegro.setDevolver}
          opcion={reintegro.opcion}
          pregunta="¿Se reintegra la plata?"
          si="Si, reintegrar"
          valor={reintegro.devolver}
        />
      )}
      {reintegra ? (
        <>
          <CampoTexto
            id="devolucion-monto"
            label={`Monto a reintegrar (cobrado: ${formatearMoneda(cobrado)})`}
            onChange={setMonto}
            step="0.01"
            type="number"
            value={monto ?? String(montoSugerido)}
          />
          <CampoSelect
            id="devolucion-medio"
            label="Medio del reintegro"
            onChange={(valorCampo) => setMedio(valorCampo as MedioPago)}
            options={MEDIOS_PAGO.map((medioPago) => ({ label: formatearEstado(medioPago), value: medioPago }))}
            value={medio}
          />
        </>
      ) : null}
      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Registrar devolucion" />
    </form>
  );
}

type DevolucionesPedidoProps = {
  idPedido: string;
  esAdministrador: boolean;
  detalles: PedidoDetalle[];
  entregado: boolean;
  onCambio: () => Promise<void> | void;
};

// Devoluciones de un pedido entregado (#96): que volvio, si volvio al stock y si se reintegro la
// plata. Se registra una nueva desde aca; no se editan ni se borran.
export function DevolucionesPedido({ idPedido, detalles, entregado, esAdministrador, onCambio }: DevolucionesPedidoProps) {
  const [resumen, setResumen] = useState<DevolucionesDelPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modal = useModal();

  const cargar = useCallback(async () => {
    try {
      setResumen(await listarDevoluciones(idPedido));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible cargar las devoluciones");
    }
  }, [idPedido]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function registrar(payload: RegistrarDevolucionPayload) {
    setResumen(await registrarDevolucion(idPedido, payload));
    modal.cerrar();
    await onCambio();
  }

  const devueltas = cantidadesDevueltas(resumen?.devoluciones ?? []);
  const quedaPorDevolver = detalles.some(
    (detalle) => Number(detalle.cantidad) > (devueltas.get(detalle.idPedidoDetalle) ?? 0)
  );

  if (!entregado && (resumen?.devoluciones.length ?? 0) === 0) {
    return null;
  }

  return (
    <div aria-label="Devoluciones del pedido" role="region">
      <p className="marca-pequena">Devoluciones</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {resumen ? (
        <>
          {resumen.devoluciones.length === 0 ? (
            <p className="texto-secundario">No hubo devoluciones.</p>
          ) : (
            <TablaDatos
              columns={[
                { header: "Fecha", cell: (devolucion) => formatearDia(devolucion.fecha) },
                {
                  header: "Que volvio",
                  cell: (devolucion) =>
                    devolucion.detalles
                      .map((detalle) => `${formatearCantidad(detalle.cantidad)} x ${detalle.pedidoDetalle.nombreItemSnapshot}`)
                      .join(", ")
                },
                {
                  header: "Valor",
                  cell: (devolucion) =>
                    formatearMoneda(devolucion.detalles.reduce((suma, detalle) => suma + Number(detalle.subtotal), 0))
                },
                { header: "Stock", cell: (devolucion) => (devolucion.devuelveStock ? "Volvio al stock" : "No volvio") },
                {
                  header: "Reintegro",
                  cell: (devolucion) =>
                    devolucion.pagoReintegro
                      ? `${formatearMoneda(-Number(devolucion.pagoReintegro.monto))} (${formatearEstado(devolucion.pagoReintegro.medioPago)})`
                      : "-"
                },
                { header: "Motivo", cell: (devolucion) => devolucion.motivo },
                {
                  header: "Registrada por",
                  cell: (devolucion) =>
                    devolucion.usuario ? `${devolucion.usuario.nombre} ${devolucion.usuario.apellido}` : "-"
                }
              ]}
              data={resumen.devoluciones}
              keyExtractor={(devolucion) => devolucion.idDevolucion}
            />
          )}
          {entregado && quedaPorDevolver ? (
            <button className="boton-secundario" onClick={() => modal.abrir()} type="button">
              Registrar devolucion
            </button>
          ) : null}
        </>
      ) : null}

      <Modal
        abierto={modal.abierto}
        descripcion="El cliente devuelve todo o una parte de lo entregado. No se puede deshacer."
        onClose={modal.cerrar}
        titulo="Registrar devolucion"
      >
        {modal.abierto ? (
          <FormularioDevolucion
            detalles={detalles}
            devueltas={devueltas}
            esAdministrador={esAdministrador}
            idPedido={idPedido}
            onCancel={modal.cerrar}
            onSubmit={registrar}
          />
        ) : null}
      </Modal>
    </div>
  );
}
