// Titulo y descripcion de cada pantalla con EncabezadoModulo. Son texto fijo por ruta: el layout
// privado los muestra en el marco mientras valida la sesion, y la pantalla los usa al cargar.
// Una sola fuente para que no se desfasen.
export const ENCABEZADOS_MODULO: Record<string, { titulo: string; descripcion: string }> = {
  "/categorias": {
    titulo: "Categorias",
    descripcion:
      "Gestiona altas, ediciones y activacion de categorias del catalogo."
  },
  "/clientes": {
    titulo: "Clientes",
    descripcion:
      "Gestiona la cartera de clientes y sus datos principales."
  },
  "/items-catalogo": {
    titulo: "Items catalogo",
    descripcion:
      "Gestiona los productos e insumos del catalogo y su receta de componentes."
  },
  "/pedidos": {
    titulo: "Pedidos",
    descripcion:
      "Carga pedidos, confirmalos para descontar stock y segui su preparacion y cobro."
  },
  "/produccion": {
    titulo: "Produccion",
    descripcion:
      "Planifica que fabricar, inicia la produccion para consumir insumos y finalizala para ingresar productos."
  },
  "/reportes": {
    titulo: "Reportes",
    descripcion:
      "Lo vendido en el mes por item y por cliente: pedidos confirmados en el mes, sin cancelados (el mismo criterio del panel)."
  },
  "/solicitudes-especiales": {
    titulo: "Solicitudes especiales",
    descripcion:
      "Gestiona requerimientos especiales y su seguimiento interno."
  },
  "/stock": {
    titulo: "Stock",
    descripcion:
      "Existencias de productos e insumos, sus movimientos y ajustes manuales."
  },
  "/usuarios": {
    titulo: "Usuarios",
    descripcion:
      "Gestiona quienes pueden ingresar al panel y quienes administran usuarios."
  }
};
