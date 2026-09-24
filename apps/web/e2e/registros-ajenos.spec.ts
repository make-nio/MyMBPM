import { api, crearCategoria, crearCliente, crearItem, crearProductoConStock } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Acceso a registros ajenos (ver "Alcance por registro" en docs/contrato-api.md): lo que un
// usuario no deberia alcanzar aunque tenga sesion. Hay un solo negocio, asi que los datos del
// negocio (pedidos, stock, clientes...) son de todos; lo propio de cada usuario es su clave.

async function estado(metodo: string, ruta: string, token: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${URL_WEB}${ruta}`, {
    method: metodo,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  return respuesta.status;
}

async function crearUsuario(esAdministrador = false) {
  const usuario = unico("prueba-ajenos").toLowerCase();
  const password = "clave-ajenos-1";
  const alta = await api<{ idUsuario: string }>("POST", "/api/usuarios", {
    nombre: "Ajeno",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password,
    esAdministrador
  });
  const { token } = await api<{ token: string }>("POST", "/api/autenticacion/login", { identificador: usuario, password });
  return { idUsuario: alta.idUsuario, token, password };
}

test("la clave: cada uno cambia solo la suya, y un error de clave no cierra la sesion", async () => {
  const a = await crearUsuario();
  const b = await crearUsuario();

  expect(await estado("PATCH", `/api/usuarios/${b.idUsuario}/clave`, a.token, {
    passwordActual: a.password,
    passwordNueva: "clave-robada-1"
  })).toBe(403);

  // Clave actual incorrecta: 400 (un 401 le diria a la web que la sesion vencio).
  expect(await estado("PATCH", `/api/usuarios/${a.idUsuario}/clave`, a.token, {
    passwordActual: "no-es-la-clave",
    passwordNueva: "clave-nueva-1"
  })).toBe(400);
  expect(await estado("GET", "/api/autenticacion/me", a.token)).toBe(200);

  expect(await estado("PATCH", `/api/usuarios/${a.idUsuario}/clave`, a.token, {
    passwordActual: a.password,
    passwordNueva: "clave-nueva-1"
  })).toBe(200);
});

test("un usuario desactivado pierde el acceso y un administrador degradado pierde lo de administrador", async () => {
  const operador = await crearUsuario();
  const administrador = await crearUsuario(true);
  expect(await estado("GET", "/api/usuarios", administrador.token)).toBe(200);

  await api("PATCH", `/api/usuarios/${operador.idUsuario}/estado`, { activo: false });
  expect(await estado("GET", "/api/pedidos", operador.token)).toBe(401);

  await api("PATCH", `/api/usuarios/${administrador.idUsuario}`, { esAdministrador: false });
  expect(await estado("GET", "/api/usuarios", administrador.token)).toBe(403);
  expect(await estado("GET", "/api/pedidos", administrador.token)).toBe(200);
});

test("una linea, un componente o una imagen solo se alcanzan desde su propio padre", async () => {
  const operador = await crearUsuario();
  const cliente = await crearCliente(unico("PRUEBA-ClienteAjenos"));
  const producto = await crearProductoConStock(unico("PRUEBA-ProdAjenos"), 100, 10);

  // Pedidos: la linea del pedido X no se toca desde el pedido Y.
  const pedidoX = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  const pedidoY = await api<{ idPedido: string }>("POST", "/api/pedidos", { idCliente: cliente.idCliente, origenPedido: "MANUAL" });
  const conLinea = await api<{ detalles: Array<{ idPedidoDetalle: string }> }>("POST", `/api/pedidos/${pedidoX.idPedido}/detalles`, {
    idItemCatalogo: producto.idItemCatalogo,
    cantidad: 1
  });
  const linea = conLinea.detalles[0].idPedidoDetalle;
  expect(await estado("PATCH", `/api/pedidos/${pedidoY.idPedido}/detalles/${linea}`, operador.token, { cantidad: 5 })).toBe(404);
  expect(await estado("DELETE", `/api/pedidos/${pedidoY.idPedido}/detalles/${linea}`, operador.token)).toBe(404);

  // Produccion: igual con las lineas de una orden.
  const ordenX = await api<{ idOrdenProduccion: string }>("POST", "/api/produccion", { observaciones: "PRUEBA ajenos X" });
  const ordenY = await api<{ idOrdenProduccion: string }>("POST", "/api/produccion", { observaciones: "PRUEBA ajenos Y" });
  const conDetalle = await api<{ detalles: Array<{ idOrdenProduccionDetalle: string }> }>(
    "POST",
    `/api/produccion/${ordenX.idOrdenProduccion}/detalles`,
    { idItemCatalogoProducto: producto.idItemCatalogo, cantidad: 1 }
  );
  const detalle = conDetalle.detalles[0].idOrdenProduccionDetalle;
  expect(
    await estado("PATCH", `/api/produccion/${ordenY.idOrdenProduccion}/detalles/${detalle}`, operador.token, { cantidad: 5 })
  ).toBe(404);
  expect(await estado("DELETE", `/api/produccion/${ordenY.idOrdenProduccion}/detalles/${detalle}`, operador.token)).toBe(404);

  // Catalogo: el componente y la imagen del item X no se tocan desde el item Y.
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatAjenos"));
  const itemX = await crearItem({ idCategoria, nombre: unico("PRUEBA-ItemX"), tipoItem: "PRODUCTO", precio: 10 });
  const itemY = await crearItem({ idCategoria, nombre: unico("PRUEBA-ItemY"), tipoItem: "PRODUCTO", precio: 10 });
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-InsAjenos"), tipoItem: "INSUMO" });
  const componente = await api<{ idItemCatalogoComponente: string }>("POST", `/api/items-catalogo/${itemX.idItemCatalogo}/componentes`, {
    idItemCatalogoHijo: insumo.idItemCatalogo,
    cantidadRequerida: 1,
    unidadMedida: "UN"
  });
  const imagen = await api<{ idItemCatalogoImagen: string }>("POST", `/api/items-catalogo/${itemX.idItemCatalogo}/imagenes`, {
    urlImagen: "https://example.com/ajena.png"
  });
  expect(
    await estado("PATCH", `/api/items-catalogo/${itemY.idItemCatalogo}/componentes/${componente.idItemCatalogoComponente}`, operador.token, {
      cantidadRequerida: 9
    })
  ).toBe(404);
  expect(
    await estado("DELETE", `/api/items-catalogo/${itemY.idItemCatalogo}/componentes/${componente.idItemCatalogoComponente}`, operador.token)
  ).toBe(404);
  expect(
    await estado("DELETE", `/api/items-catalogo/${itemY.idItemCatalogo}/imagenes/${imagen.idItemCatalogoImagen}`, operador.token)
  ).toBe(404);

  // Y nada de eso cambio el registro original.
  const pedido = await api<{ detalles: Array<{ cantidad: string }> }>("GET", `/api/pedidos/${pedidoX.idPedido}`);
  expect(Number(pedido.detalles[0].cantidad)).toBe(1);
});
