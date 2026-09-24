import { ReactNode } from "react";

type ColumnaTabla<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
};

type TablaDatosProps<T> = {
  data: T[];
  columns: ColumnaTabla<T>[];
  keyExtractor: (item: T) => string;
};

// En pantallas angostas cada fila se muestra como tarjeta (ver globals.css): data-label lleva
// el nombre de la columna. Los roles ARIA son explicitos porque cambiar el display de una
// tabla le quita la semantica en algunos navegadores.
export function TablaDatos<T>({
  data,
  columns,
  keyExtractor
}: TablaDatosProps<T>) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla-datos" role="table">
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((column) => (
              <th className={column.className} key={column.header} role="columnheader">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {data.map((item) => (
            <tr key={keyExtractor(item)} role="row">
              {columns.map((column) => (
                <td className={column.className} data-label={column.header} key={column.header} role="cell">
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
