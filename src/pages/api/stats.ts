import type { APIRoute } from 'astro';
import { getDb } from '../../lib/runtime';

export const GET: APIRoute = async () => {
  const sql = await getDb();

  const [result] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE email_verified = TRUE) AS total_signups,
      MAX(created_at) FILTER (WHERE email_verified = TRUE) AS last_signup_at
    FROM waitlist
  `;

  return new Response(
    JSON.stringify({
      total_signups: Number(result.total_signups),
      last_signup_at: result.last_signup_at,
    }),
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=30' },
    },
  );
};
