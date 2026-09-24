type ComponenteReceta = {
  idItemCatalogoHijo: string;
  nombreInsumo: string;
  cantidadRequerida: string | number;
  activo: boolean;
};

export type CapacidadComponente = {
  idItemCatalogoHijo: string;
  nombreInsumo: string;
  cantidadRequerida: number;
  stockInsumo: number;
  alcanzaPara: number;
};

// Cuantas unidades de un producto se pueden fabricar con el stock actual de los insumos de su
// receta activa: el minimo, entre componentes, de floor(stock / cantidad requerida).
// null si el producto no tiene receta activa.
export function calcularCapacidadProduccion(
  componentes: ComponenteReceta[],
  stockInsumos: Record<string, string | number>
) {
  const activos = componentes.filter((componente) => componente.activo && Number(componente.cantidadRequerida) > 0);

  if (activos.length === 0) {
    return { porComponente: [] as CapacidadComponente[], unidades: null };
  }

  const porComponente = activos.map((componente) => {
    const cantidadRequerida = Number(componente.cantidadRequerida);
    const stockInsumo = Number(stockInsumos[componente.idItemCatalogoHijo] ?? 0);

    return {
      idItemCatalogoHijo: componente.idItemCatalogoHijo,
      nombreInsumo: componente.nombreInsumo,
      cantidadRequerida,
      stockInsumo,
      // El epsilon evita que 0.3 / 0.1 = 2.9999999999999996 cuente como 2.
      alcanzaPara: Math.max(0, Math.floor(stockInsumo / cantidadRequerida + 1e-9))
    };
  });

  return { porComponente, unidades: Math.min(...porComponente.map((componente) => componente.alcanzaPara)) };
}
