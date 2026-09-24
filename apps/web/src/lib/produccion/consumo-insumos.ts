import { EgresoPrevisto } from "../stock/impacto-stock";

type DetalleOrden = { idItemCatalogoProducto: string; nombreProducto: string; cantidad: string | number };
type ComponenteReceta = {
  idItemCatalogoHijo: string;
  nombreInsumo: string;
  cantidadRequerida: string | number;
  activo: boolean;
};

// Replica lo que hace la API al iniciar una orden: por cada producto a fabricar, descuenta
// cantidad x cantidadRequerida de cada componente ACTIVO de su receta (stock de INSUMO).
// Los productos sin componentes activos se informan aparte: la API no deja iniciar la orden.
export function calcularConsumosPrevistos(
  detalles: DetalleOrden[],
  recetas: Record<string, ComponenteReceta[]>
) {
  const egresos: EgresoPrevisto[] = [];
  const productosSinReceta: string[] = [];

  for (const detalle of detalles) {
    const componentes = (recetas[detalle.idItemCatalogoProducto] ?? []).filter((componente) => componente.activo);

    if (componentes.length === 0) {
      productosSinReceta.push(detalle.nombreProducto);
      continue;
    }

    for (const componente of componentes) {
      egresos.push({
        idItemCatalogo: componente.idItemCatalogoHijo,
        nombre: componente.nombreInsumo,
        cantidad: Math.round(Number(detalle.cantidad) * Number(componente.cantidadRequerida) * 10000) / 10000
      });
    }
  }

  return { egresos, productosSinReceta: [...new Set(productosSinReceta)] };
}
