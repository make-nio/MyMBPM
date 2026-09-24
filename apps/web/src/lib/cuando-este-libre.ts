// requestIdleCallback donde exista (Safari no lo tiene): corre la funcion cuando el navegador no
// tiene otra cosa que hacer, o a los 2 segundos como mucho. Devuelve la funcion para cancelarla.
export function cuandoEsteLibre(funcion: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(funcion, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(funcion, 200);
  return () => window.clearTimeout(id);
}
