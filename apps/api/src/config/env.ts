type EnvConfig = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getEnv(): EnvConfig {
  return {
    // Solo aplica al servidor local (server.ts); en Netlify la API corre como function.
    port: Number(process.env.PORT) || 3002,
    databaseUrl: requireEnv("NETLIFY_DATABASE_URL"),
    jwtSecret: requireEnv("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h"
  };
}
