"use client";

import { useUsuarioAutenticado } from "../../auth/contexto-sesion";

type Tema = { titulo: string; puntos: string[] };

// Guia para quien administra: solo la ven los administradores. Los nombres de botones son los
// de la pantalla; si cambian alla, cambian aca.
const temas: Tema[] = [
  {
    titulo: "Usuarios",
    puntos: [
      "En Usuarios, \"Nuevo usuario\" pide nombre, apellido, email, usuario y una clave inicial. Tilda \"Administrador\" solo si esa persona tiene que gestionar usuarios y ver costos.",
      "Un usuario comun (operador) carga y ve pedidos, clientes, stock y produccion, pero no ve costos, ganancia, Reportes, Usuarios ni el historial de cambios, y no puede importar el catalogo.",
      "\"Restablecer clave\" le pone una clave nueva a alguien que se la olvido. Pasasela por un medio privado y pedile que no la comparta.",
      "Si alguien ya no tiene que entrar, toca \"Desactivar\": pierde el acceso en el momento, aunque tenga la sesion abierta. No se borra porque su nombre queda en el historial de pedidos y movimientos.",
      "Cada ingreso dura unas horas (8 por defecto); despues hay que volver a ingresar. Con 5 claves mal puestas en 15 minutos, esa cuenta queda bloqueada 15 minutos."
    ]
  },
  {
    titulo: "Importar el catalogo",
    puntos: [
      "En Items catalogo, \"Importar CSV\" y despues \"Descargar plantilla\": completala en Excel o Google Sheets y guardala como CSV.",
      "Hasta 1000 filas por archivo. Las categorias que no existen se crean solas; un item con el mismo nombre que uno existente da error y no se duplica.",
      "Antes de importar ves cuantas filas estan bien y cuales tienen error. Se importa todo o nada: con una sola fila mal, no se carga ninguna."
    ]
  },
  {
    titulo: "Exportar a CSV",
    puntos: [
      "\"Exportar CSV\" esta en Pedidos (con los filtros que tengas puestos), en Stock y en cada tabla de Reportes.",
      "Se exporta todo lo filtrado, no solo lo que se ve en pantalla. El archivo usa punto y coma y se abre directo en Excel."
    ]
  },
  {
    titulo: "Reportes",
    puntos: [
      "\"Vendido\" son los pedidos confirmados en el mes, sin los cancelados: es el mismo criterio del Dashboard.",
      "El costo de cada linea se toma cuando se agrega al pedido. Si un item no tenia costo cargado, la ganancia sale mas alta de lo real y el reporte lo avisa."
    ]
  },
  {
    titulo: "Respaldos",
    puntos: [
      "Todos los dias a las 4 de la mañana se guarda una copia de la base en Netlify (Blobs, store \"respaldos\"). Quedan las ultimas 14.",
      "La copia tiene todos los datos del negocio y los usuarios, pero no las claves ni los intentos de ingreso.",
      "Bajar o restaurar un respaldo es una tarea tecnica (esta explicada en docs/respaldos.md del repositorio): si alguna vez hace falta, pediselo a Mariano. Ademas, Neon permite volver la base a un momento anterior."
    ]
  },
  {
    titulo: "Si aparece un error con referencia",
    puntos: [
      "Cuando algo falla del lado del servidor, la pantalla dice \"Referencia del error: 3F9A-12BC\" (con otro codigo).",
      "Anota o saca captura de ese codigo y de lo que estabas haciendo, y pasaselo a Mariano: con el codigo se encuentra el error exacto en el registro de Netlify.",
      "Los avisos de datos mal cargados (un campo vacio, una cantidad invalida) no traen referencia: se corrigen en la misma pantalla."
    ]
  }
];

export function GuiaAdministrador() {
  const { esAdministrador } = useUsuarioAutenticado();

  if (!esAdministrador) {
    return null;
  }

  return (
    <section aria-label="Guia del administrador" className="tarjeta-seccion">
      <h2>Guia del administrador</h2>
      <p className="texto-secundario">Solo la ven los administradores.</p>
      {temas.map((tema) => (
        <section aria-label={tema.titulo} className="ayuda__tema" key={tema.titulo}>
          <h3>{tema.titulo}</h3>
          <ul>
            {tema.puntos.map((punto) => (
              <li key={punto}>{punto}</li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
