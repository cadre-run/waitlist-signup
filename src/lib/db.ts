import postgres from 'postgres';

// In production (Cloudflare Workers), Hyperdrive provides the connection string
// via env.HYPERDRIVE.connectionString. In dev (Node), we use DATABASE_URL from .env.
const connectionString =
  import.meta.env.DATABASE_URL ||
  (globalThis as any).process?.env?.DATABASE_URL ||
  '';

const sql = postgres(connectionString, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: 'require',
});

export default sql;
