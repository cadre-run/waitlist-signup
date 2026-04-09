import sql from './db';

export async function isRateLimited(ip: string): Promise<boolean> {
  const [result] = await sql`
    SELECT COUNT(*) AS cnt FROM waitlist
    WHERE ip_address = ${ip}
      AND created_at > NOW() - INTERVAL '1 hour'
  `;
  return Number(result.cnt) >= 3;
}
