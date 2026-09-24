import { revisarContratoFetch } from "./contrato";
import { api, crearCategoria, crearItem } from "./api";
import { URL_WEB } from "./entorno";
import { expect, test, unico } from "./fixtures";

// Los endpoints que ninguna pantalla usa en los otros E2E, llamados por la API para que su
// respuesta tambien se valide contra el contrato (e2e/api.ts la valida en cada llamada).

test("health responde segun el contrato", async () => {
  const respuesta = await fetch(`${URL_WEB}/api/health`);
  expect(revisarContratoFetch("GET", `${URL_WEB}/api/health`, respuesta.status, await respuesta.json())).toEqual([]);
});

test("categoria, item, imagenes y componentes por id", async () => {
  const { idCategoria } = await crearCategoria(unico("PRUEBA-CatContrato"));
  await api("GET", `/api/categorias/${idCategoria}`);

  const producto = await crearItem({ idCategoria, nombre: unico("PRUEBA-ProdContrato"), tipoItem: "PRODUCTO", precio: 10 });
  const insumo = await crearItem({ idCategoria, nombre: unico("PRUEBA-InsContrato"), tipoItem: "INSUMO" });

  const imagen = await api<{ idItemCatalogoImagen: string }>("POST", `/api/items-catalogo/${producto.idItemCatalogo}/imagenes`, {
    urlImagen: "https://example.com/prueba.png"
  });
  await api("DELETE", `/api/items-catalogo/${producto.idItemCatalogo}/imagenes/${imagen.idItemCatalogoImagen}`);

  const componente = await api<{ idItemCatalogoComponente: string }>(
    "POST",
    `/api/items-catalogo/${producto.idItemCatalogo}/componentes`,
    { idItemCatalogoHijo: insumo.idItemCatalogo, cantidadRequerida: 1, unidadMedida: "UN" }
  );
  await api("PATCH", `/api/items-catalogo/${producto.idItemCatalogo}/componentes/${componente.idItemCatalogoComponente}`, {
    cantidadRequerida: 2
  });
});

test("solicitud especial por id y su edicion", async () => {
  const solicitud = await api<{ idSolicitudEspecial: string }>("POST", "/api/solicitudes-especiales", {
    nombreSolicitante: unico("PRUEBA-SolContrato"),
    descripcion: "Contrato"
  });
  await api("GET", `/api/solicitudes-especiales/${solicitud.idSolicitudEspecial}`);
  await api("PATCH", `/api/solicitudes-especiales/${solicitud.idSolicitudEspecial}`, { observaciones: "Editada" });
});

test("stock bajo minimo, usuario por id y cambio de la clave propia", async () => {
  await api("GET", "/api/stock/bajo-stock");

  const usuario = unico("prueba-contrato").toLowerCase();
  const alta = await api<{ idUsuario: string }>("POST", "/api/usuarios", {
    nombre: "Maxi",
    apellido: "PRUEBA",
    email: `${usuario}@mymbpm.test`,
    usuario,
    password: "clave-inicial-1"
  });
  await api("GET", `/api/usuarios/${alta.idUsuario}`);

  const login = await api<{ token: string }>("POST", "/api/autenticacion/login", {
    identificador: usuario,
    password: "clave-inicial-1"
  });
  await api(
    "PATCH",
    `/api/usuarios/${alta.idUsuario}/clave`,
    { passwordActual: "clave-inicial-1", passwordNueva: "clave-nueva-123" },
    login.token
  );
});
