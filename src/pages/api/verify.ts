import type { APIRoute } from 'astro';
import sql from '../../lib/db';
import { creditReferral } from '../../lib/referral';
import { sendWelcomeEmail } from '../../lib/resend';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const siteUrl = import.meta.env.SITE_URL || 'https://cadre.run';

  if (!token) {
    return new Response('Missing verification token', { status: 400 });
  }

  const [entry] = await sql`
    SELECT id, email, referral_code, referred_by, position, email_verified
    FROM waitlist
    WHERE verification_token = ${token}
  `;

  if (!entry) {
    return new Response('Invalid or expired verification token', { status: 400 });
  }

  if (entry.email_verified) {
    return Response.redirect(`${siteUrl}/welcome?code=${entry.referral_code}&verified=true`, 302);
  }

  await sql`
    UPDATE waitlist
    SET email_verified = TRUE, verification_token = NULL, updated_at = NOW()
    WHERE id = ${entry.id}
  `;

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

  if (entry.referred_by) {
    await creditReferral(entry.referred_by, entry.email, ip);
  }

  const [updated] = await sql`SELECT position FROM waitlist WHERE id = ${entry.id}`;

  await sendWelcomeEmail(entry.email, updated.position, entry.referral_code, entry.id);

  return Response.redirect(`${siteUrl}/welcome?code=${entry.referral_code}&verified=true`, 302);
};
