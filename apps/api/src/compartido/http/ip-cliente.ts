import { Request } from "express";

// IP del cliente para limitar intentos de ingreso. En Netlify la pone el CDN en
// x-nf-client-connection-ip. x-forwarded-for no se usa porque el cliente le puede agregar valores
// y asi esquivar el limite. En local (sin Netlify) queda la IP del socket.
export function obtenerIpCliente(request: Request): string | null {
  const ipNetlify = request.headers["x-nf-client-connection-ip"];

  if (typeof ipNetlify === "string" && ipNetlify.trim()) {
    return ipNetlify.trim();
  }

  return request.socket?.remoteAddress ?? null;
}
