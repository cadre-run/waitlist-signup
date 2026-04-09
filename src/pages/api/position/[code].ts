import type { APIRoute } from 'astro';
import sql from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { code } = params;

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 });
  }

  const [entry] = await sql`
    SELECT position, original_position, referral_count, email_verified
    FROM waitlist
    WHERE referral_code = ${code}
  `;

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(
    JSON.stringify({
      position: entry.position,
      original_position: entry.original_position,
      referral_count: entry.referral_count,
      verified: entry.email_verified,
    }),
    { status: 200 },
  );
};
