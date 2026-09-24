// Ayudas para verificar, al compilar, que las listas de valores de la web (para selects y
// filtros) tienen exactamente los valores del contrato de la API. Solo tipos: no generan JS.
export type Afirmar<T extends true> = T;

export type ListaCompleta<Lista extends readonly string[], Valores extends string> = [
  Exclude<Valores, Lista[number]>,
  Exclude<Lista[number], Valores>
] extends [never, never]
  ? true
  : false;
