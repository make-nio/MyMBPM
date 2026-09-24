// Costos y ganancia calculados en la web con datos que ya llegan de la API. Los montos se
// redondean a centavos para no arrastrar errores de coma flotante.

const centavos = (valor: number) => Math.round(valor * 100) / 100;

type LineaConCosto = { cantidad: string; costoUnitario?: string };

// Ganancia de un pedido: su total menos el costo de cada linea, guardado al cargarla.
export function calcularMargenPedido(total: string, lineas: LineaConCosto[]) {
  const costo = centavos(lineas.reduce((suma, linea) => suma + Number(linea.costoUnitario ?? 0) * Number(linea.cantidad), 0));
  const vendido = Number(total);
  const ganancia = centavos(vendido - costo);

  return {
    costo,
    ganancia,
    // Porcentaje sobre lo vendido; sin venta no tiene sentido.
    porcentaje: vendido > 0 ? Math.round((ganancia / vendido) * 100) : null,
    lineasSinCosto: lineas.filter((linea) => Number(linea.costoUnitario ?? 0) === 0).length
  };
}

type ComponenteConCosto = {
  cantidadRequerida: string;
  activo: boolean;
  itemCatalogoComponente?: { nombre: string; costo?: string | null } | null;
};

// Costo de fabricar una unidad segun su receta: cantidad de cada insumo por su costo cargado.
export function calcularCostoReceta(componentes: ComponenteConCosto[]) {
  const activos = componentes.filter((componente) => componente.activo);
  const sinCosto = activos
    .filter((componente) => !Number(componente.itemCatalogoComponente?.costo ?? 0))
    .map((componente) => componente.itemCatalogoComponente?.nombre ?? "-");

  return {
    costo: centavos(
      activos.reduce(
        (suma, componente) =>
          suma + Number(componente.cantidadRequerida) * Number(componente.itemCatalogoComponente?.costo ?? 0),
        0
      )
    ),
    sinCosto
  };
}
