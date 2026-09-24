"use client";

import { useState } from "react";

import { useUsuarioAutenticado } from "../../../src/components/auth/contexto-sesion";
import { FormularioRestablecerClave } from "../../../src/components/modulos/usuarios/formulario-restablecer-clave";
import { FormularioUsuario } from "../../../src/components/modulos/usuarios/formulario-usuario";
import { EncabezadoModulo } from "../../../src/components/ui/encabezado-modulo";
import { EstadoCargando } from "../../../src/components/ui/estado-cargando";
import { EstadoVacio } from "../../../src/components/ui/estado-vacio";
import { MensajeError } from "../../../src/components/ui/mensaje-error";
import { MensajeExito } from "../../../src/components/ui/mensaje-exito";
import { Modal } from "../../../src/components/ui/modal";
import { PieListado } from "../../../src/components/ui/pie-listado";
import { TablaDatos } from "../../../src/components/ui/tabla-datos";
import { useListadoPaginado } from "../../../src/hooks/use-listado-paginado";
import { useModal } from "../../../src/hooks/use-modal";
import { ENCABEZADOS_MODULO } from "../../../src/lib/encabezados-modulo";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  cerrarSesionesUsuario,
  crearUsuario,
  listarUsuarios,
  restablecerClaveUsuario
} from "../../../src/lib/modulos/usuarios";
import { Usuario, UsuarioAltaPayload, UsuarioEdicionPayload } from "../../../src/types/usuarios";

type FiltroActivo = "todos" | "activos" | "inactivos";

function filtroAParametro(filtro: FiltroActivo) {
  return filtro === "todos" ? undefined : filtro === "activos";
}

export default function UsuariosPage() {
  const usuarioActual = useUsuarioAutenticado();

  if (!usuarioActual.esAdministrador) {
    return (
      <section className="modulo-panel">
        <EstadoVacio
          descripcion="La gestion de usuarios esta disponible solo para administradores."
          titulo="Sin acceso"
        />
      </section>
    );
  }

  return <GestionUsuarios idUsuarioActual={usuarioActual.idUsuario} />;
}

function GestionUsuarios({ idUsuarioActual }: { idUsuarioActual: string }) {
  const modalUsuario = useModal<Usuario>();
  const modalClave = useModal<Usuario>();
  const modalSesiones = useModal<Usuario>();
  const [cerrandoSesiones, setCerrandoSesiones] = useState(false);
  const [errorAccion, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("todos");

  const listado = useListadoPaginado<Usuario>(
    (limit, offset) => listarUsuarios({ activo: filtroAParametro(filtroActivo), limit, offset }),
    [filtroActivo],
    "No fue posible cargar los usuarios"
  );
  const { items: usuarios, cargando, recargar } = listado;
  const error = listado.error ?? errorAccion;

  async function guardarUsuario(payload: UsuarioAltaPayload | UsuarioEdicionPayload) {
    if (modalUsuario.contexto) {
      await actualizarUsuario(modalUsuario.contexto.idUsuario, payload);
    } else {
      await crearUsuario(payload as UsuarioAltaPayload);
    }

    modalUsuario.cerrar();
    setAviso(null);
    await recargar();
  }

  async function restablecerClave(passwordNueva: string) {
    const usuario = modalClave.contexto;

    if (!usuario) {
      return;
    }

    await restablecerClaveUsuario(usuario.idUsuario, passwordNueva);
    modalClave.cerrar();
    setAviso(`Clave restablecida para ${usuario.usuario}. Pasale la clave nueva por un medio seguro.`);
  }

  async function cerrarSesiones() {
    const usuario = modalSesiones.contexto;

    if (!usuario) {
      return;
    }

    setCerrandoSesiones(true);
    setError(null);

    try {
      await cerrarSesionesUsuario(usuario.idUsuario);
      modalSesiones.cerrar();
      setAviso(`Se cerraron las sesiones de ${usuario.usuario} en todos sus dispositivos.`);
    } catch (currentError) {
      modalSesiones.cerrar();
      setError(currentError instanceof Error ? currentError.message : "No fue posible cerrar las sesiones");
    } finally {
      setCerrandoSesiones(false);
    }
  }

  async function toggleEstado(usuario: Usuario) {
    setError(null);
    setAviso(null);

    try {
      await cambiarEstadoUsuario(usuario.idUsuario, !usuario.activo);
      await recargar();
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "No fue posible cambiar el estado"
      );
    }
  }

  return (
    <section className="modulo-panel">
      <EncabezadoModulo
        {...ENCABEZADOS_MODULO["/usuarios"]}
        botonLabel="Nuevo usuario"
        filtros={
          <select
            aria-label="Filtrar por estado"
            className="control-filtro"
            onChange={(event) => setFiltroActivo(event.target.value as FiltroActivo)}
            value={filtroActivo}
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        }
        onCrear={() => modalUsuario.abrir(null)}
      />

      {error ? <MensajeError mensaje={error} /> : null}
      {aviso ? <MensajeExito mensaje={aviso} /> : null}
      {cargando ? <EstadoCargando titulo="Cargando usuarios" /> : null}
      {!cargando && !error && usuarios.length === 0 ? (
        <EstadoVacio
          descripcion="No hay usuarios para el filtro seleccionado."
          titulo="No encontramos usuarios"
        />
      ) : null}

      {!cargando && usuarios.length > 0 ? (
        <TablaDatos
          columns={[
            {
              header: "Nombre",
              cell: (usuario) =>
                `${usuario.nombre} ${usuario.apellido}${usuario.idUsuario === idUsuarioActual ? " (vos)" : ""}`
            },
            { header: "Usuario", cell: (usuario) => usuario.usuario },
            { header: "Email", cell: (usuario) => usuario.email },
            { header: "Rol", cell: (usuario) => (usuario.esAdministrador ? "Administrador" : "Operador") },
            { header: "Estado", cell: (usuario) => (usuario.activo ? "Activo" : "Inactivo") },
            {
              header: "Acciones",
              cell: (usuario) => (
                <div className="acciones-tabla">
                  <button
                    className="boton-secundario"
                    onClick={() => modalUsuario.abrir(usuario)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => modalClave.abrir(usuario)}
                    type="button"
                  >
                    Restablecer clave
                  </button>
                  <button
                    className="boton-secundario"
                    onClick={() => {
                      setAviso(null);
                      modalSesiones.abrir(usuario);
                    }}
                    type="button"
                  >
                    Cerrar sesiones
                  </button>
                  {usuario.idUsuario !== idUsuarioActual ? (
                    <button
                      className="boton-secundario"
                      onClick={() => void toggleEstado(usuario)}
                      type="button"
                    >
                      {usuario.activo ? "Desactivar" : "Activar"}
                    </button>
                  ) : null}
                </div>
              )
            }
          ]}
          data={usuarios}
          keyExtractor={(usuario) => usuario.idUsuario}
        />
      ) : null}

      {!cargando ? (
        <PieListado
          cantidad={usuarios.length}
          cargandoMas={listado.cargandoMas}
          hayMas={listado.hayMas}
          onCargarMas={() => void listado.cargarMas()}
        />
      ) : null}

      <Modal
        abierto={modalUsuario.abierto}
        descripcion={
          modalUsuario.contexto
            ? "Actualiza los datos y el rol del usuario."
            : "La persona ingresa con este usuario o su email y la clave inicial."
        }
        onClose={modalUsuario.cerrar}
        titulo={modalUsuario.contexto ? "Editar usuario" : "Nuevo usuario"}
      >
        <FormularioUsuario
          onCancel={modalUsuario.cerrar}
          onSubmit={guardarUsuario}
          usuario={modalUsuario.contexto}
        />
      </Modal>

      <Modal
        abierto={modalClave.abierto}
        descripcion={`Asigna una clave nueva a ${modalClave.contexto?.usuario ?? ""}. No hace falta la clave anterior.`}
        onClose={modalClave.cerrar}
        titulo="Restablecer clave"
      >
        <FormularioRestablecerClave onCancel={modalClave.cerrar} onSubmit={restablecerClave} />
      </Modal>

      <Modal
        abierto={modalSesiones.abierto}
        descripcion={
          modalSesiones.contexto?.idUsuario === idUsuarioActual
            ? "Se cierra tu sesion en todos los dispositivos, incluido este: vas a tener que ingresar de nuevo."
            : `${modalSesiones.contexto?.usuario ?? ""} va a tener que ingresar de nuevo en todos sus dispositivos. Sirve si perdio el celular o alguien mas conoce su clave (en ese caso, restablecela tambien).`
        }
        onClose={modalSesiones.cerrar}
        titulo="Cerrar sesiones"
      >
        <div className="acciones-formulario">
          <button className="boton-secundario" onClick={modalSesiones.cerrar} type="button">
            Cancelar
          </button>
          <button className="boton-primario" disabled={cerrandoSesiones} onClick={() => void cerrarSesiones()} type="button">
            {cerrandoSesiones ? "Cerrando..." : "Cerrar sesiones"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
