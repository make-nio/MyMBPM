import { PrismaClient } from "@prisma/client";

declare global {
  // Reuse the Prisma client in development to avoid exhausting connections.
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
