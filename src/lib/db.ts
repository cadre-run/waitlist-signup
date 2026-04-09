import postgres from 'postgres';
import type { Sql } from 'postgres';

export function getSql(runtimeEnv?: Record<string, any>): Sql {
  // Cloudflare Workers: each request needs its own connection
  // (I/O objects cannot be shared across request contexts)
  const connectionString =
    runtimeEnv?.HYPERDRIVE?.connectionString ||
    import.meta.env.DATABASE_URL ||
    '';

  if (!connectionString) {
    throw new Error('No database connection string available');
  }

  return postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    ...(runtimeEnv?.HYPERDRIVE ? {} : { ssl: 'require' }),
  });
}
