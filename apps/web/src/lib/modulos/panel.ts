import { apiFetch, buildQuery } from "../api";
import { AvisosPanel, ResumenPanel } from "../../types/panel";

export function obtenerResumenPanel(limite = 5) {
  return apiFetch<{ ok: true; data: ResumenPanel }>(`/api/panel/resumen${buildQuery({ limite })}`).then(
    (response) => response.data
  );
}

export function obtenerAvisos() {
  return apiFetch<{ ok: true; data: AvisosPanel }>("/api/panel/avisos").then((response) => response.data);
}
