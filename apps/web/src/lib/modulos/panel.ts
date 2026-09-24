import { apiFetch, buildQuery } from "../api";
import { ResumenPanel } from "../../types/panel";

export function obtenerResumenPanel(limite = 5) {
  return apiFetch<{ ok: true; data: ResumenPanel }>(`/api/panel/resumen${buildQuery({ limite })}`).then(
    (response) => response.data
  );
}
