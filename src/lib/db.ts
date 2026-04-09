import postgres from 'postgres';

const sql = postgres(import.meta.env.DATABASE_URL, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 15,
  ssl: 'require',
});

export default sql;
