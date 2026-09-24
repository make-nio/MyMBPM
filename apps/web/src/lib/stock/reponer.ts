// Cuanto producir para volver al stock minimo. Un item esta "bajo minimo" tambien cuando esta
// justo en el minimo (ver stock.service de la API): ahi falta 0, asi que se propone 1 para que la
// orden tenga sentido. Las ordenes son de unidades enteras: se redondea para arriba.
export function cantidadParaReponer(stockActual: string | number, stockMinimo: number) {
  const faltante = Math.ceil(stockMinimo - Number(stockActual));
  return Math.max(faltante, 1);
}

// /produccion?producir=ID&cantidad=N abre "Nueva orden" con ese producto y esa cantidad.
export function rutaOrdenParaReponer(idItemCatalogo: string, cantidad: number) {
  return `/produccion?producir=${idItemCatalogo}&cantidad=${cantidad}`;
}

// Lee lo que dejo rutaOrdenParaReponer; null si falta o no es valido.
export function leerOrdenParaReponer(busqueda: string) {
  const parametros = new URLSearchParams(busqueda);
  const idItemCatalogo = parametros.get("producir");
  const cantidad = Number(parametros.get("cantidad"));

  if (!idItemCatalogo || !/^\d+$/.test(idItemCatalogo) || !Number.isInteger(cantidad) || cantidad < 1) {
    return null;
  }

  return { idItemCatalogo, cantidad };
}
