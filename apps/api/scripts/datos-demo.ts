// Carga un negocio de impresion 3D creible en una base LOCAL vacia, para probar la web a mano:
// insumos, productos con receta, stock, ordenes de produccion y pedidos en todos los estados,
// clientes y solicitudes especiales. Todo pasa por los services (el stock lo mueve
// stock.service, como en la aplicacion), asi que los datos cumplen las mismas reglas.
//
//   cd apps/api
//   NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_demo JWT_SECRET=x \
//     npm run demo:cargar
//
// Se niega si la base no es local o si ya tiene items. Si no hay usuarios, crea el administrador
// "demo" (clave "demo-mym-2026"). Los pedidos se reparten en los ultimos 12 meses (fechas de alta,
// confirmacion y entrega); los movimientos de stock quedan con la fecha del dia en que se cargo.
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const url = process.env.NETLIFY_DATABASE_URL ?? "";

if (!url || !HOSTS_LOCALES.has(new URL(url).hostname)) {
  console.error(
    `Los datos de demo solo se cargan en una base local; NETLIFY_DATABASE_URL apunta a "${url ? new URL(url).hostname : "(vacia)"}".`
  );
  process.exit(1);
}

type Receta = Array<[insumo: string, cantidad: number, unidad: string]>;

const CATEGORIAS = ["Filamentos y resinas", "Accesorios y packaging", "Hogar y deco", "Llaveros", "Macetas", "Figuras", "Escritorio", "Cocina"];

// [nombre, categoria, costo por unidad, stock inicial, stock minimo]
const INSUMOS: Array<[string, string, number, number, number]> = [
  ["PLA negro (g)", "Filamentos y resinas", 22, 3000, 500],
  ["PLA blanco (g)", "Filamentos y resinas", 22, 4000, 500],
  ["PLA rojo (g)", "Filamentos y resinas", 24, 1200, 300],
  ["PLA madera (g)", "Filamentos y resinas", 31, 800, 300],
  ["PETG transparente (g)", "Filamentos y resinas", 28, 1500, 300],
  ["TPU flexible (g)", "Filamentos y resinas", 45, 150, 200],
  ["Resina gris (ml)", "Filamentos y resinas", 60, 900, 250],
  ["Argolla de llavero", "Accesorios y packaging", 90, 300, 50],
  ["Iman de neodimio", "Accesorios y packaging", 120, 120, 40],
  ["Pintura acrilica (ml)", "Accesorios y packaging", 35, 400, 100],
  ["Caja kraft chica", "Accesorios y packaging", 250, 80, 30],
  ["Tira LED calida", "Accesorios y packaging", 2800, 12, 5]
];

// [nombre, categoria, precio, stock inicial, stock minimo, material, color, receta]
const PRODUCTOS: Array<[string, string, number, number, number, string, string, Receta]> = [
  ["Maceta geometrica chica", "Macetas", 6500, 14, 5, "PLA", "Blanco", [["PLA blanco (g)", 60, "g"], ["Caja kraft chica", 1, "u"]]],
  ["Maceta geometrica grande", "Macetas", 11800, 6, 3, "PLA", "Blanco", [["PLA blanco (g)", 140, "g"], ["Caja kraft chica", 1, "u"]]],
  ["Maceta autorriego", "Macetas", 14500, 2, 3, "PETG", "Transparente", [["PETG transparente (g)", 160, "g"]]],
  ["Llavero con nombre", "Llaveros", 3500, 40, 15, "PLA", "Rojo", [["PLA rojo (g)", 8, "g"], ["Argolla de llavero", 1, "u"]]],
  ["Llavero mate", "Llaveros", 3200, 25, 10, "PLA", "Madera", [["PLA madera (g)", 7, "g"], ["Argolla de llavero", 1, "u"]]],
  ["Llavero patita", "Llaveros", 2900, 8, 10, "TPU", "Negro", [["TPU flexible (g)", 5, "g"], ["Argolla de llavero", 1, "u"]]],
  ["Figura dragon pintada", "Figuras", 24000, 3, 2, "Resina", "Gris", [["Resina gris (ml)", 90, "ml"], ["Pintura acrilica (ml)", 6, "ml"], ["Caja kraft chica", 1, "u"]]],
  ["Busto personalizado", "Figuras", 38000, 1, 1, "Resina", "Gris", [["Resina gris (ml)", 140, "ml"], ["Pintura acrilica (ml)", 10, "ml"]]],
  ["Mini figura gamer", "Figuras", 9500, 10, 4, "Resina", "Gris", [["Resina gris (ml)", 25, "ml"], ["Pintura acrilica (ml)", 3, "ml"]]],
  ["Soporte de celular", "Escritorio", 5200, 18, 6, "PLA", "Negro", [["PLA negro (g)", 45, "g"]]],
  ["Organizador de escritorio", "Escritorio", 12500, 5, 3, "PLA", "Madera", [["PLA madera (g)", 180, "g"]]],
  ["Porta auriculares", "Escritorio", 8900, 7, 3, "PLA", "Negro", [["PLA negro (g)", 110, "g"]]],
  ["Lampara luna", "Hogar y deco", 21000, 4, 2, "PLA", "Blanco", [["PLA blanco (g)", 150, "g"], ["Tira LED calida", 1, "u"]]],
  ["Imanes para heladera x4", "Hogar y deco", 4800, 12, 5, "PLA", "Rojo", [["PLA rojo (g)", 20, "g"], ["Iman de neodimio", 4, "u"]]],
  ["Porta cepillos", "Hogar y deco", 6900, 9, 4, "PETG", "Transparente", [["PETG transparente (g)", 70, "g"]]],
  ["Cortante de galletitas x3", "Cocina", 4500, 20, 8, "PLA", "Blanco", [["PLA blanco (g)", 30, "g"]]],
  ["Molde para chocolate", "Cocina", 7400, 0, 3, "PETG", "Transparente", [["PETG transparente (g)", 55, "g"]]],
  ["Pedido a medida (servicio)", "Figuras", 15000, 0, 0, "Varios", "-", []]
];

const NOMBRES = ["Lucia", "Martin", "Sofia", "Diego", "Carla", "Tomas", "Valentina", "Joaquin", "Camila", "Federico", "Agustina", "Nicolas", "Florencia", "Matias", "Julieta", "Santiago", "Micaela", "Franco", "Rocio", "Ezequiel"];
const APELLIDOS = ["Gomez", "Fernandez", "Rodriguez", "Lopez", "Martinez", "Perez", "Sosa", "Romero", "Alvarez", "Torres", "Ruiz", "Benitez", "Acosta", "Medina", "Herrera", "Suarez"];
const LOCALIDADES: Array<[string, string]> = [["CABA", "Buenos Aires"], ["La Plata", "Buenos Aires"], ["Quilmes", "Buenos Aires"], ["Rosario", "Santa Fe"], ["Cordoba", "Cordoba"], ["Mar del Plata", "Buenos Aires"]];
const ORIGENES = ["INSTAGRAM", "WHATSAPP", "WEB", "MANUAL"] as const;

// Pseudoaleatorio con semilla: la demo sale igual cada vez.
let semilla = 20260924;
function azar() {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
}
const elegir = <T>(lista: readonly T[]) => lista[Math.floor(azar() * lista.length)];
const entre = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
const slug = (texto: string) => texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const DIA_MS = 24 * 60 * 60 * 1000;

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { categoriasService } = await import("../src/modulos/categorias/categorias.service");
  const { itemsCatalogoService } = await import("../src/modulos/items-catalogo/items-catalogo.service");
  const { clientesService } = await import("../src/modulos/clientes/clientes.service");
  const { stockService } = await import("../src/modulos/stock/stock.service");
  const { produccionService } = await import("../src/modulos/produccion/produccion.service");
  const { pedidosService } = await import("../src/modulos/pedidos/pedidos.service");
  const { solicitudesEspecialesService } = await import("../src/modulos/solicitudes-especiales/solicitudes-especiales.service");
  const { usuariosService } = await import("../src/modulos/usuarios/usuarios.service");

  try {
    if ((await prisma.itemCatalogo.count()) > 0) {
      throw new Error("La base ya tiene items: los datos de demo se cargan en una base vacia (createdb + prisma migrate deploy).");
    }

    let admin = await prisma.usuario.findFirst({ where: { esAdministrador: true, activo: true } });
    if (!admin) {
      await usuariosService.crear({ nombre: "Maxi", apellido: "Demo", email: "demo@mym.local", usuario: "demo", password: "demo-mym-2026", esAdministrador: true });
      admin = await prisma.usuario.findFirstOrThrow({ where: { usuario: "demo" } });
      console.log('Usuario administrador: "demo", clave "demo-mym-2026".');
    }
    const idUsuario = admin.idUsuario;

    const categorias = new Map<string, bigint>();
    for (const nombre of CATEGORIAS) {
      categorias.set(nombre, (await categoriasService.crear({ nombre, slug: slug(nombre) })).idCategoria);
    }

    const items = new Map<string, { id: bigint; precio: number }>();
    for (const [nombre, categoria, costo, stock, stockMinimo] of INSUMOS) {
      const item = await itemsCatalogoService.crear(
        { idCategoria: categorias.get(categoria)!, tipoItem: "INSUMO", nombre, slug: slug(nombre), costo, stockMinimo },
        idUsuario
      );
      items.set(nombre, { id: item.idItemCatalogo, precio: 0 });
      await stockService.crearAjusteManual({ idItemCatalogo: item.idItemCatalogo, idUsuario, tipoStock: "INSUMO", tipoMovimiento: "AJUSTE_POSITIVO", cantidad: stock, observaciones: "Compra inicial (datos de demo)" });
    }

    for (const [nombre, categoria, precio, stock, stockMinimo, material, color, receta] of PRODUCTOS) {
      const costo = receta.reduce((total, [insumo, cantidad]) => total + INSUMOS.find(([n]) => n === insumo)![2] * cantidad, 0);
      const item = await itemsCatalogoService.crear(
        {
          idCategoria: categorias.get(categoria)!,
          tipoItem: "PRODUCTO",
          nombre,
          slug: slug(nombre),
          codigo: `MYM-${String(items.size + 1).padStart(3, "0")}`,
          precio,
          costo: receta.length ? costo : undefined,
          tipoMaterial: material,
          color,
          stockMinimo,
          publico: true
        },
        idUsuario
      );
      items.set(nombre, { id: item.idItemCatalogo, precio });
      for (const [insumo, cantidad, unidad] of receta) {
        await itemsCatalogoService.agregarComponente(item.idItemCatalogo, { idItemCatalogoHijo: items.get(insumo)!.id, cantidadRequerida: cantidad, unidadMedida: unidad });
      }
      if (stock > 0) {
        await stockService.crearAjusteManual({ idItemCatalogo: item.idItemCatalogo, idUsuario, tipoStock: "PRODUCTO", tipoMovimiento: "AJUSTE_POSITIVO", cantidad: stock, observaciones: "Stock inicial (datos de demo)" });
      }
    }

    // Produccion: finalizadas (consumen insumos e ingresan productos), en proceso, pendientes y una cancelada.
    const ordenes: Array<[string, number, "FINALIZADA" | "EN_PROCESO" | "PENDIENTE" | "CANCELADA"]> = [
      ["Llavero con nombre", 30, "FINALIZADA"],
      ["Maceta geometrica chica", 10, "FINALIZADA"],
      ["Soporte de celular", 12, "FINALIZADA"],
      ["Mini figura gamer", 6, "FINALIZADA"],
      ["Imanes para heladera x4", 10, "FINALIZADA"],
      ["Lampara luna", 3, "EN_PROCESO"],
      ["Organizador de escritorio", 4, "EN_PROCESO"],
      ["Maceta autorriego", 6, "PENDIENTE"],
      ["Molde para chocolate", 8, "PENDIENTE"],
      ["Porta cepillos", 5, "CANCELADA"]
    ];
    for (const [producto, cantidad, estado] of ordenes) {
      const orden = await produccionService.crear({ observaciones: `Tanda de ${producto.toLowerCase()}` });
      await produccionService.agregarDetalle(orden.idOrdenProduccion, { idItemCatalogoProducto: items.get(producto)!.id, cantidad });
      if (estado === "FINALIZADA" || estado === "EN_PROCESO") {
        await produccionService.iniciar(orden.idOrdenProduccion, idUsuario);
      }
      if (estado === "FINALIZADA") {
        await produccionService.finalizar(orden.idOrdenProduccion, idUsuario);
      }
      if (estado === "CANCELADA") {
        await produccionService.actualizarEstado(orden.idOrdenProduccion, { estadoProduccion: "CANCELADA" });
      }
    }

    const clientes: bigint[] = [];
    for (let i = 0; i < 36; i += 1) {
      const nombre = NOMBRES[i % NOMBRES.length];
      const apellido = APELLIDOS[(i * 7) % APELLIDOS.length];
      const [localidad, provincia] = elegir(LOCALIDADES);
      const cliente = await clientesService.crear(
        {
          nombre,
          apellido,
          telefono: `11 ${entre(3000, 6999)}-${entre(1000, 9999)}`,
          email: azar() > 0.3 ? `${slug(nombre)}.${slug(apellido)}${i}@correo.test` : undefined,
          instagram: azar() > 0.5 ? `@${slug(nombre)}_${slug(apellido)}` : undefined,
          localidad,
          provincia,
          observaciones: i % 9 === 0 ? "Cliente frecuente: prefiere retirar en el taller." : undefined
        },
        idUsuario
      );
      clientes.push(cliente.idCliente);
    }

    // Pedidos: los mas viejos entregados (y algunos cancelados); los ultimos, en todos los estados
    // abiertos, con entregas atrasadas, para hoy y para la semana.
    const vendibles = PRODUCTOS.filter(([, , , , , , , receta]) => receta.length > 0).map(([nombre]) => nombre);
    const ahora = Date.now();
    const TOTAL = 70;
    for (let n = 0; n < TOTAL; n += 1) {
      const diasAtras = Math.round(((TOTAL - n) / TOTAL) * 360);
      const recientes = TOTAL - n <= 14;
      const estado = recientes
        ? (["PENDIENTE", "PENDIENTE", "CONFIRMADO", "CONFIRMADO", "EN_PREPARACION", "LISTO"] as const)[n % 6]
        : n % 11 === 0
          ? "CANCELADO"
          : "ENTREGADO";
      const alta = new Date(ahora - diasAtras * DIA_MS);
      const entrega = recientes ? new Date(ahora + ((n % 5) - 2) * DIA_MS) : azar() > 0.5 ? new Date(alta.getTime() + 7 * DIA_MS) : null;
      const pedido = await pedidosService.crear({
        idCliente: elegir(clientes),
        origenPedido: elegir(ORIGENES),
        observacionesCliente: azar() > 0.8 ? "Si se puede, en tonos pastel." : undefined,
        fechaEntrega: entrega
      });

      // Las fechas del historial (los services usan la del momento).
      await prisma.pedido.update({ where: { idPedido: pedido.idPedido }, data: { fechaAlta: alta } });

      for (const producto of new Set(Array.from({ length: entre(1, 3) }, () => elegir(vendibles)))) {
        await pedidosService.agregarDetalle(pedido.idPedido, { idItemCatalogo: items.get(producto)!.id, cantidad: entre(1, 2) });
      }

      const confirmar = estado !== "PENDIENTE" && !(estado === "CANCELADO" && n % 2 === 0);
      if (confirmar) {
        try {
          await pedidosService.confirmar(pedido.idPedido, idUsuario);
        } catch {
          if (recientes) {
            // Sin stock para confirmarlo: queda pendiente, como pasaria en el taller.
            continue;
          }
          // En el historial se habria fabricado o comprado: se repone lo que falta y se confirma.
          const { detalles } = await pedidosService.obtenerPorId(pedido.idPedido);
          for (const detalle of detalles) {
            await stockService.crearAjusteManual({ idItemCatalogo: detalle.idItemCatalogo, idUsuario, tipoStock: "PRODUCTO", tipoMovimiento: "AJUSTE_POSITIVO", cantidad: Number(detalle.cantidad) + 2, observaciones: "Reposicion (datos de demo)" });
          }
          await pedidosService.confirmar(pedido.idPedido, idUsuario);
        }
        await prisma.pedido.update({ where: { idPedido: pedido.idPedido }, data: { fechaConfirmacion: new Date(alta.getTime() + DIA_MS / 2) } });
      }
      if (estado === "EN_PREPARACION" || estado === "LISTO" || estado === "ENTREGADO" || estado === "CANCELADO") {
        await pedidosService.actualizarEstado(pedido.idPedido, {
          estadoPedido: estado,
          estadoCobro: estado === "ENTREGADO" ? "PAGADO" : estado === "CANCELADO" ? undefined : "SEÑADO"
        });
      }
    }

    const solicitudes: Array<[string, string, "PENDIENTE" | "EN_REVISION" | "APROBADA" | "RECHAZADA" | null]> = [
      ["Carolina Diaz", "Trofeo para torneo de padel, 12 unidades con el logo del club.", "EN_REVISION"],
      ["Estudio Arq Norte", "Maqueta de una casa a escala 1:100 para presentacion.", "APROBADA"],
      ["Pablo Ibarra", "Repuesto de una perilla de horno, mando foto por WhatsApp.", "PENDIENTE"],
      ["Jardin Los Pinos", "40 llaveros con el nombre de cada chico para fin de anio.", null],
      ["Marcos Vidal", "Replica de una espada de videojuego a tamanio real.", "RECHAZADA"]
    ];
    for (const [nombre, descripcion, estado] of solicitudes) {
      // La que se convierte en pedido necesita un cliente.
      const solicitud = await solicitudesEspecialesService.crear({
        idCliente: estado === null ? elegir(clientes) : undefined,
        nombreSolicitante: nombre,
        telefono: `11 ${entre(3000, 6999)}-${entre(1000, 9999)}`,
        descripcion
      });
      if (estado && estado !== "PENDIENTE") {
        await solicitudesEspecialesService.cambiarEstado(solicitud.idSolicitudEspecial, estado);
      }
      if (estado === null) {
        await solicitudesEspecialesService.convertirEnPedido(solicitud.idSolicitudEspecial);
      }
    }

    const resumen = await Promise.all([prisma.itemCatalogo.count(), prisma.cliente.count(), prisma.pedido.groupBy({ by: ["estadoPedido"], _count: { _all: true } }), prisma.ordenProduccion.count()]);
    console.log(`Listo: ${resumen[0]} items, ${resumen[1]} clientes, ${resumen[3]} ordenes de produccion.`);
    console.log(`Pedidos por estado: ${resumen[2].map((fila) => `${fila.estadoPedido} ${fila._count._all}`).join(", ")}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
