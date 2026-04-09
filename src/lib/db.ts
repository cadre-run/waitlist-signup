import postgres, { type Sql } from 'postgres';

let _sql: Sql | null = null;

export function getSql(runtimeEnv?: Record<string, any>): Sql {
  // Reuse existing connection in dev (same process)
  if (_sql) return _sql;

  const connectionString =
    runtimeEnv?.HYPERDRIVE?.connectionString ||
    import.meta.env.DATABASE_URL ||
    '';

  if (!connectionString) {
    throw new Error('No database connection string available');
  }

  _sql = postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    ...(runtimeEnv?.HYPERDRIVE ? {} : { ssl: 'require' }),
  });

  return _sql;
}
