// Quien puede ver costos y ganancia (costo de items, costo de cada linea de pedido, margen y
// ventas del mes). Hoy solo administradores, igual que el historial de cambios. Si Maxi quiere
// que sus operadores los vean, se abre aca.
export function puedeVerCostos(usuario?: { esAdministrador: boolean } | null) {
  return usuario?.esAdministrador === true;
}
