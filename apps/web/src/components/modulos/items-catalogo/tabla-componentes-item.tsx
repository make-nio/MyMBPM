import { ItemCatalogoComponente } from "../../../types/items-catalogo";
import { TablaDatos } from "../../ui/tabla-datos";

type TablaComponentesItemProps = {
  componentes: ItemCatalogoComponente[];
  onEditar: (componente: ItemCatalogoComponente) => void;
  onEliminar: (componente: ItemCatalogoComponente) => void;
};

export function TablaComponentesItem({
  componentes,
  onEditar,
  onEliminar
}: TablaComponentesItemProps) {
  return (
    <TablaDatos
      columns={[
        {
          header: "Componente",
          cell: (componente) => componente.itemCatalogoComponente?.nombre ?? "-"
        },
        {
          header: "Tipo",
          cell: (componente) => componente.itemCatalogoComponente?.tipoItem ?? "-"
        },
        {
          header: "Cantidad",
          cell: (componente) => componente.cantidadRequerida
        },
        {
          header: "Unidad",
          cell: (componente) => componente.unidadMedida
        },
        {
          header: "Estado",
          cell: (componente) => (componente.activo ? "Activo" : "Inactivo")
        },
        {
          header: "Acciones",
          cell: (componente) => (
            <div className="acciones-tabla">
              <button
                className="boton-secundario"
                onClick={() => onEditar(componente)}
                type="button"
              >
                Editar
              </button>
              <button
                className="boton-secundario"
                onClick={() => onEliminar(componente)}
                type="button"
              >
                Eliminar
              </button>
            </div>
          )
        }
      ]}
      data={componentes}
      keyExtractor={(componente) => componente.idItemCatalogoComponente}
    />
  );
}
