import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // Reuse the Prisma client in development to avoid exhausting connections.
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prisma 7 se conecta con el driver adapter de pg (ya no hay query engine en Rust). La API usa la
// conexion pooled de Neon (NETLIFY_DATABASE_URL); el CLI toma la directa de prisma.config.ts.
export function crearPrismaClient(url = process.env.NETLIFY_DATABASE_URL) {
  // pg no tiene tope de espera para conectar por defecto: con la base caida la function quedaria
  // colgada hasta el timeout de Netlify en vez de responder "base no disponible".
  const adapter = new PrismaPg({ connectionString: url, connectionTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? crearPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
