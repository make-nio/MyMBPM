// Contexto de Netlify en el que se construyo la web (CONTEXT: production, deploy-preview,
// branch-deploy...). Lo fija next.config.ts en el build; en local y en CI queda vacio.
export const CONTEXTO_DESPLIEGUE = process.env.NEXT_PUBLIC_CONTEXTO_DESPLIEGUE ?? "";

// Los deploy previews usan la base de produccion (ver docs/despliegue-netlify.md): hay que
// avisar que lo que se cargue ahi es real. Solo en Netlify y fuera de produccion.
export function esVistaPrevia(contexto: string = CONTEXTO_DESPLIEGUE) {
  return contexto !== "" && contexto !== "production";
}
