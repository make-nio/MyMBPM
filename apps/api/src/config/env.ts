type EnvConfig = {
  port: number;
  databaseUrl: string;
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
    port: Number(process.env.PORT) || 3001,
    databaseUrl: requireEnv("DATABASE_URL")
  };
}
