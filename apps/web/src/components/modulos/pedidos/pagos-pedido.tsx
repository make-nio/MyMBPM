"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AccionesFormulario } from "../../formularios/acciones-formulario";
import { CampoSelect } from "../../formularios/campo-select";
import { CampoTextarea } from "../../formularios/campo-textarea";
import { CampoTexto } from "../../formularios/campo-texto";
import { MensajeError } from "../../ui/mensaje-error";
import { Modal } from "../../ui/modal";
import { TablaDatos } from "../../ui/tabla-datos";
import { useModal } from "../../../hooks/use-modal";
import { useValidacionFormulario } from "../../../hooks/use-validacion-formulario";
import { diaArgentina, formatearDia, formatearEstado, formatearMoneda } from "../../../lib/formato";
import { anularPago, listarPagos, registrarPago } from "../../../lib/modulos/pagos";
import { numeroMayorACero, requerido } from "../../../lib/validacion";
import { MEDIOS_PAGO, MedioPago, Pago, PagosDelPedido, RegistrarPagoPayload } from "../../../types/pagos";

function FormularioPago({
  saldo,
  onCancel,
  onSubmit
}: {
  saldo: string;
  onCancel: () => void;
  onSubmit: (payload: RegistrarPagoPayload) => Promise<void>;
}) {
  const [fecha, setFecha] = useState(() => diaArgentina(new Date()));
  // Por defecto, lo que falta cobrar.
  const [monto, setMonto] = useState(String(Number(saldo)));
  const [medioPago, setMedioPago] = useState<MedioPago>("EFECTIVO");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({
      "pago-fecha": { valor: fecha, reglas: [requerido("la fecha del pago")] },
      "pago-monto": { valor: monto, reglas: [requerido("el monto"), numeroMayorACero()] }
    });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit({ fecha, monto: Number(monto), medioPago, observaciones: observaciones || undefined });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible registrar el pago");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}
      <CampoTexto error={errorDe("pago-fecha", fecha)} id="pago-fecha" label="Fecha" onChange={setFecha} type="date" value={fecha} />
      <CampoTexto
        error={errorDe("pago-monto", monto)}
        id="pago-monto"
        label="Monto"
        onChange={setMonto}
        step="0.01"
        type="number"
        value={monto}
      />
      <CampoSelect
        id="pago-medio"
        label="Medio de pago"
        onChange={(valor) => setMedioPago(valor as MedioPago)}
        options={MEDIOS_PAGO.map((medio) => ({ label: formatearEstado(medio), value: medio }))}
        value={medioPago}
      />
      <CampoTextarea id="pago-observaciones" label="Observaciones (opcional)" onChange={setObservaciones} rows={2} value={observaciones} />
      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Registrar pago" />
    </form>
  );
}

function FormularioAnulacion({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (motivo: string) => Promise<void> }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formularioRef, validar, errorDe } = useValidacionFormulario();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resumen = validar({ "anulacion-motivo": { valor: motivo, reglas: [requerido("el motivo de la anulacion")] } });
    if (resumen) {
      setError(resumen);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await onSubmit(motivo);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible anular el pago");
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-modulo" noValidate onSubmit={handleSubmit} ref={formularioRef}>
      {error ? <MensajeError mensaje={error} /> : null}
      <CampoTextarea
        error={errorDe("anulacion-motivo", motivo)}
        id="anulacion-motivo"
        label="Motivo"
        onChange={setMotivo}
        rows={2}
        value={motivo}
      />
      <AccionesFormulario enviando={enviando} onCancel={onCancel} textoGuardar="Anular pago" />
    </form>
  );
}

type PagosPedidoProps = {
  idPedido: string;
  // Cambia cuando el pedido se recarga (total, estado): vuelve a pedir los pagos.
  version: string;
  cancelado: boolean;
  esAdministrador: boolean;
  onCambio: () => Promise<void> | void;
};

// Cobros del pedido (#90): lo cobrado y el saldo, registrar un pago y, para administradores,
// anularlo con motivo. El estado de cobro lo calcula la API con estos pagos. Si hubo
// devoluciones (#96), lo devuelto baja el saldo y los reintegros aparecen como pagos negativos.
export function PagosPedido({ idPedido, version, cancelado, esAdministrador, onCambio }: PagosPedidoProps) {
  const [resumen, setResumen] = useState<PagosDelPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalPago = useModal();
  const modalAnular = useModal<Pago>();

  const cargar = useCallback(async () => {
    try {
      setResumen(await listarPagos(idPedido));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No fue posible cargar los pagos");
    }
  }, [idPedido]);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  async function registrar(payload: RegistrarPagoPayload) {
    setResumen(await registrarPago(idPedido, payload));
    modalPago.cerrar();
    await onCambio();
  }

  async function anular(motivo: string) {
    if (!modalAnular.contexto) {
      return;
    }
    setResumen(await anularPago(idPedido, modalAnular.contexto.idPago, motivo));
    modalAnular.cerrar();
    await onCambio();
  }

  const conSaldo = resumen !== null && Number(resumen.saldo) > 0;

  return (
    <div aria-label="Pagos del pedido" role="region">
      <p className="marca-pequena">Pagos</p>
      {error ? <MensajeError mensaje={error} /> : null}
      {resumen ? (
        <>
          <p className="texto-secundario texto-secundario--compacto">
            {Number(resumen.devuelto) > 0 ? (
              <>
                Devuelto: <strong data-testid="pedido-devuelto">{formatearMoneda(resumen.devuelto)}</strong> ·{" "}
              </>
            ) : null}
            Cobrado: <strong data-testid="pedido-cobrado">{formatearMoneda(resumen.cobrado)}</strong> ·{" "}
            {/* Devolver sin reintegrar un pedido pagado deja plata a favor del cliente (#96). */}
            {Number(resumen.saldo) < 0 ? "A favor del cliente:" : "Saldo:"}{" "}
            <strong data-testid="pedido-saldo">{formatearMoneda(Math.abs(Number(resumen.saldo)))}</strong>
            {cancelado && Number(resumen.cobrado) > 0 ? (
              <strong className="texto-alerta"> · Pedido cancelado con {formatearMoneda(resumen.cobrado)} cobrados</strong>
            ) : null}
          </p>
          {resumen.pagos.length === 0 ? (
            <p className="texto-secundario">Todavia no se registraron pagos.</p>
          ) : (
            <TablaDatos
              columns={[
                { header: "Fecha", cell: (pago) => formatearDia(pago.fecha) },
                { header: "Medio", cell: (pago) => formatearEstado(pago.medioPago) },
                { header: "Monto", cell: (pago) => formatearMoneda(pago.monto) },
                {
                  header: "Registrado por",
                  cell: (pago) => (pago.usuario ? `${pago.usuario.nombre} ${pago.usuario.apellido}` : "-")
                },
                {
                  header: "Estado",
                  // Un reintegro de una devolucion es un pago negativo (#96).
                  cell: (pago) =>
                    pago.anulado ? `Anulado: ${pago.motivoAnulacion ?? ""}` : Number(pago.monto) < 0 ? "Reintegro" : "Vigente"
                },
                {
                  header: "Acciones",
                  cell: (pago) =>
                    esAdministrador && !pago.anulado && Number(pago.monto) > 0 ? (
                      <button
                        aria-label={`Anular pago de ${formatearMoneda(pago.monto)} del ${formatearDia(pago.fecha)}`}
                        className="boton-secundario"
                        onClick={() => modalAnular.abrir(pago)}
                        type="button"
                      >
                        Anular
                      </button>
                    ) : (
                      "-"
                    )
                }
              ]}
              data={resumen.pagos}
              keyExtractor={(pago) => pago.idPago}
            />
          )}
          {!cancelado && conSaldo ? (
            <button className="boton-secundario" onClick={() => modalPago.abrir()} type="button">
              Registrar pago
            </button>
          ) : null}
        </>
      ) : null}

      <Modal abierto={modalPago.abierto} descripcion="No puede superar el saldo del pedido." onClose={modalPago.cerrar} titulo="Registrar pago">
        {resumen ? <FormularioPago onCancel={modalPago.cerrar} onSubmit={registrar} saldo={resumen.saldo} /> : null}
      </Modal>
      <Modal
        abierto={modalAnular.abierto}
        descripcion="El pago no se borra: queda anulado, con el motivo, y deja de contar como cobrado."
        onClose={modalAnular.cerrar}
        titulo="Anular pago"
      >
        <FormularioAnulacion onCancel={modalAnular.cerrar} onSubmit={anular} />
      </Modal>
    </div>
  );
}
