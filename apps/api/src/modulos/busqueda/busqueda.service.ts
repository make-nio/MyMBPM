import { RESULTADOS_POR_GRUPO } from "./busqueda.schemas";
import { busquedaRepository } from "./busqueda.repository";

// Busqueda global (Ctrl+K): pocos resultados por grupo, con lo justo para reconocerlos y abrir
// su pantalla. El costo de los items solo viaja si quien busca puede verlo (puedeVerCostos);
// ademas, ocultarCostosSinPermiso lo quita de toda respuesta privada.
export const busquedaService = {
  async buscar(texto: string, opciones: { verCostos: boolean }) {
    const [pedidos, clientes, items] = await Promise.all([
      busquedaRepository.buscarPedidos(texto, RESULTADOS_POR_GRUPO),
      busquedaRepository.buscarClientes(texto, RESULTADOS_POR_GRUPO),
      busquedaRepository.buscarItems(texto, RESULTADOS_POR_GRUPO)
    ]);

    return {
      pedidos,
      clientes,
      items: items.map(({ costo, categoria, ...item }) => ({
        ...item,
        categoria: categoria.nombre,
        ...(opciones.verCostos ? { costo } : {})
      }))
    };
  }
};
