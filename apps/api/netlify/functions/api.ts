// Punto de entrada de la Netlify Function que sirve /api/*.
// La logica vive en src/netlify.ts para que la cubra el typecheck del workspace.
export { handler } from "../../src/netlify";
