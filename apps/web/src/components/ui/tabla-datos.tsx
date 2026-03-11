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

export function TablaDatos<T>({
  data,
  columns,
  keyExtractor
}: TablaDatosProps<T>) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla-datos">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)}>
              {columns.map((column) => (
                <td className={column.className} key={column.header}>
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
