import Link from "next/link";

// Ayuda corta para quien usa el sistema todos los dias. Los nombres de botones y estados son los
// que aparecen en pantalla: si cambian alla, cambian aca.

type Paso = { titulo: string; pasos: string[]; ojo?: string };

const guias: Paso[] = [
  {
    titulo: "Cargar un pedido",
    pasos: [
      "En Pedidos, toca \"Nuevo pedido\".",
      "Busca el cliente escribiendo su nombre, elegi de donde vino el pedido (Instagram, WhatsApp...) y toca \"Crear pedido\".",
      "En el detalle que se abre, toca \"Agregar item\" por cada producto: buscalo por nombre y pone la cantidad.",
      "El precio se copia del catalogo en ese momento: si despues cambias el precio del producto, el pedido no cambia.",
      "Si le prometiste una fecha al cliente, cargala en \"Entrega prometida\". La podes cambiar desde el detalle con \"Guardar fecha\" hasta que el pedido se entregue.",
      "Si empezo como solicitud especial, en Solicitudes toca \"Convertir en pedido\": se crea el pedido con el cliente y la descripcion, y despues le cargas los items."
    ]
  },
  {
    titulo: "Confirmar un pedido",
    pasos: [
      "Antes de confirmar, mira \"Impacto en stock al confirmar\": te dice cuanto hay y cuanto queda de cada producto.",
      "Si falta stock de algo, no te deja confirmar: produci o ajusta el stock primero.",
      "Toca \"Confirmar pedido\" y despues \"Confirmar y descontar stock\". Ahi se descuentan los productos.",
      "Despues vas cambiando el estado (En preparacion, Listo, Entregado) y el cobro con \"Guardar estado\"."
    ],
    ojo: "Cancelar un pedido ya confirmado no devuelve el stock. Si los productos vuelven a estar disponibles, sumalos desde Stock con \"Ajustar\"."
  },
  {
    titulo: "Darle un comprobante al cliente",
    pasos: [
      "En el detalle del pedido, toca \"Comprobante\" (aparece cuando el pedido tiene items).",
      "Se abre una hoja con los datos del cliente, los items, los precios y el total.",
      "Toca \"Imprimir\". Para mandarlo por WhatsApp, en la ventana de impresion elegi \"Guardar como PDF\".",
      "La hoja no muestra costos, ganancia ni las observaciones internas: solo las observaciones del cliente."
    ],
    ojo: "Dice \"Documento no válido como factura\": sirve como constancia del pedido, no como factura."
  },
  {
    titulo: "Producir",
    pasos: [
      "Cada producto tiene que tener su receta (en Items catalogo, boton \"Receta\"): que insumos usa y cuanto.",
      "En Produccion, toca \"Nueva orden\" y despues \"Agregar producto\" con lo que vas a fabricar.",
      "Toca \"Iniciar produccion\": te muestra que insumos se van a usar y, al confirmar, los descuenta.",
      "Cuando termines, toca \"Finalizar produccion\": los productos fabricados se suman al stock.",
      "Atajo: en Stock, un producto bajo minimo tiene \"Crear orden de produccion\". Abre la orden nueva con ese producto y lo que falta para llegar al minimo; revisa la cantidad y toca \"Crear orden\" (hasta ahi no se crea nada)."
    ],
    ojo: "Si cancelas una orden que ya estaba en proceso, los insumos que se usaron no vuelven al stock."
  },
  {
    titulo: "Ajustar el stock",
    pasos: [
      "En Stock, busca el item y toca \"Ajustar\".",
      "Elegi \"Ingreso (suma)\" o \"Egreso (resta)\", la cantidad y el motivo (por ejemplo: \"compra de filamento\" o \"se rompio una pieza\").",
      "El motivo es obligatorio y queda en los movimientos, con tu usuario y la fecha.",
      "\"Solo bajo minimo\" te muestra lo que hay que reponer. El minimo de cada item se define al editarlo, en \"Stock minimo\"."
    ]
  },
  {
    titulo: "Cargar el catalogo desde una planilla (administradores)",
    pasos: [
      "En Items catalogo, toca \"Importar CSV\" y despues \"Descargar plantilla\".",
      "Completa la planilla en Excel o Google Sheets: una fila por item. Nombre, Tipo (Producto o Insumo) y Categoria son obligatorios; las categorias que no existen se crean solas.",
      "Guardala como CSV y elegila en \"Archivo CSV\": vas a ver cuantas filas estan bien y, si alguna tiene un error, cual y por que.",
      "Si hay errores, corregilos en la planilla y volve a elegir el archivo. Cuando esten todas bien, toca \"Importar\"."
    ],
    ojo: "Se importa todo o nada: si una sola fila tiene un error, no se carga ninguna. Un item que ya existe con el mismo nombre no se duplica: esa fila aparece con error."
  },
  {
    titulo: "Encontrar algo rapido",
    pasos: [
      "Toca \"Buscar\" arriba (o apreta Ctrl+K en la compu; Cmd+K en Mac) desde cualquier pantalla.",
      "Escribi un numero de pedido (alcanza con \"755\"), el nombre o telefono de un cliente, o el nombre de un item.",
      "Toca el resultado (o usa las flechas y Enter): el pedido se abre en Pedidos y el cliente o el item, en su ficha."
    ]
  },
  {
    titulo: "Cargar clientes desde una planilla (administradores)",
    pasos: [
      "En Clientes, toca \"Importar CSV\" y despues \"Descargar plantilla\".",
      "Completa una fila por cliente. Solo el nombre es obligatorio; Activo es Si o No.",
      "Elegi el archivo en \"Archivo CSV\": vas a ver cuantas filas estan bien y, si alguna tiene un error, cual y por que. Cuando esten todas bien, toca \"Importar\"."
    ],
    ojo: "Se importa todo o nada. Un cliente que ya existe (mismo email, mismo documento, o mismo nombre, apellido y telefono) da error: asi no se duplica."
  },
  {
    titulo: "Llevarte los datos a una planilla",
    pasos: [
      "En Pedidos o en Stock, aplica los filtros que quieras (en Pedidos podes elegir las fechas de alta con \"Alta desde\" y \"hasta\").",
      "Toca \"Exportar CSV\": se descarga un archivo con todo lo filtrado, no solo lo que ves en pantalla.",
      "Abrilo con Excel o Google Sheets: las columnas se separan solas y los numeros quedan como numeros."
    ]
  },
  {
    titulo: "Costos y ganancia (administradores)",
    pasos: [
      "Carga el costo de cada insumo (por ejemplo, lo que pagaste el kilo de filamento) al editarlo, en \"Costo\".",
      "En la receta de un producto vas a ver cuanto cuesta fabricarlo. Si no coincide con su costo, toca \"Usar como costo\".",
      "Cada pedido muestra su costo y su ganancia, y el Dashboard lo vendido y ganado en el mes.",
      "En Reportes elegis un mes y ves lo vendido por item y por cliente, con \"Exportar CSV\" para cada tabla."
    ],
    ojo: "El costo de un pedido se toma cuando agregas cada item: si despues cambias el costo del producto, los pedidos ya cargados no cambian."
  }
];

const estados: Array<{ grupo: string; items: Array<[string, string]> }> = [
  {
    grupo: "Pedido",
    items: [
      ["Pendiente", "Recien cargado. Se pueden agregar o sacar productos. Todavia no toco el stock."],
      ["Confirmado", "Ya se desconto el stock. Los productos no se pueden cambiar."],
      ["En preparacion", "Lo estas armando o terminando."],
      ["Listo", "Listo para entregar."],
      ["Entregado", "Ya lo tiene el cliente. Es el final."],
      ["Cancelado", "No va. Si estaba confirmado, el stock no vuelve solo."]
    ]
  },
  {
    grupo: "Cobro",
    items: [
      ["Pendiente", "Todavia no pago nada."],
      ["Señado", "Dejo una seña."],
      ["Pagado", "Pago todo."]
    ]
  },
  {
    grupo: "Orden de produccion",
    items: [
      ["Pendiente", "Armando que fabricar. No toco el stock."],
      ["En proceso", "Iniciada: ya se descontaron los insumos."],
      ["Finalizada", "Terminada: los productos se sumaron al stock."],
      ["Cancelada", "No se hace. Si estaba en proceso, los insumos no vuelven."]
    ]
  },
  {
    grupo: "Solicitud especial (pedidos a medida)",
    items: [
      ["Pendiente", "Recien llegada."],
      ["En revision", "La estas mirando o cotizando."],
      ["Aprobada", "Se va a hacer."],
      ["Rechazada", "No se hace."],
      ["Convertida a pedido", "Ya tiene su pedido: se crea con el boton \"Convertir en pedido\" y no cambia mas de estado."]
    ]
  }
];

export default function AyudaPage() {
  return (
    <section className="modulo-panel ayuda">
      <header className="encabezado-modulo">
        <div>
          <p className="marca-pequena">Ayuda</p>
          <h1>Como se usa</h1>
          <p>Lo basico para el dia a dia. Si algo no coincide con lo que ves en pantalla, avisale a Mariano.</p>
        </div>
      </header>

      {guias.map((guia) => (
        <section aria-label={guia.titulo} className="tarjeta-seccion" key={guia.titulo}>
          <h2>{guia.titulo}</h2>
          <ol className="ayuda__pasos">
            {guia.pasos.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
          {guia.ojo ? (
            <p className="ayuda__ojo">
              <strong>Ojo:</strong> {guia.ojo}
            </p>
          ) : null}
        </section>
      ))}

      <section aria-label="Que significa cada estado" className="tarjeta-seccion">
        <h2>Que significa cada estado</h2>
        {estados.map((grupo) => (
          <div className="ayuda__estados" key={grupo.grupo}>
            <h3>{grupo.grupo}</h3>
            <dl>
              {grupo.items.map(([estado, significado]) => (
                <div key={estado}>
                  <dt>{estado}</dt>
                  <dd>{significado}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>

      <p className="texto-secundario">
        Para lo que falta reponer, lo que hay para entregar y las entregas atrasadas o de esta semana, mira el{" "}
        <Link href="/panel">Dashboard</Link>.
      </p>
    </section>
  );
}
