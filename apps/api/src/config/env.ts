type EnvConfig = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getEnv(): EnvConfig {
  const corsOrigins = (
    process.env.CORS_ORIGIN ||
    "http://localhost:3000,http://localhost:3003"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    port: Number(process.env.PORT) || 3001,
    databaseUrl: requireEnv("DATABASE_URL"),
    jwtSecret: requireEnv("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
    corsOrigins
  };
}
