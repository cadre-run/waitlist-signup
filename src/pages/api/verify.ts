import type { APIRoute } from 'astro';
import { getDb, getRuntimeEnv } from '../../lib/runtime';
import { creditReferral } from '../../lib/referral';
import { sendWelcomeEmail } from '../../lib/resend';

export const GET: APIRoute = async ({ request }) => {
  const sql = await getDb();
  const env = await getRuntimeEnv();
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const siteUrl = env?.SITE_URL || import.meta.env.SITE_URL || 'https://cadre.run';

  if (!token) {
    return new Response('Missing verification token', { status: 400 });
  }

  const [entry] = await sql`
    SELECT id, email, referral_code, referred_by, position, email_verified
    FROM waitlist WHERE verification_token = ${token}
  `;

  if (!entry) {
    return new Response('Invalid or expired verification token', { status: 400 });
  }

  if (entry.email_verified) {
    return Response.redirect(`${siteUrl}/welcome?code=${entry.referral_code}&verified=true`, 302);
  }

  await sql`
    UPDATE waitlist SET email_verified = TRUE, verification_token = NULL, updated_at = NOW()
    WHERE id = ${entry.id}
  `;

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

  if (entry.referred_by) {
    await creditReferral(sql, entry.referred_by, entry.email, ip);
  }

  const [updated] = await sql`SELECT position FROM waitlist WHERE id = ${entry.id}`;

  await sendWelcomeEmail(sql, entry.email, updated.position, entry.referral_code, entry.id, env);

  return Response.redirect(`${siteUrl}/welcome?code=${entry.referral_code}&verified=true`, 302);
};
