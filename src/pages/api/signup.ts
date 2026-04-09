import type { APIRoute } from 'astro';
import sql from '../../lib/db';
import { isValidEmail, isDisposableEmail, generateReferralCode, generateVerificationToken, getNextPosition } from '../../lib/referral';
import { isRateLimited } from '../../lib/rate-limit';
import { sendVerificationEmail } from '../../lib/resend';

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';

  let body: { email?: string; ref?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const ref = body.ref?.trim();

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
  }

  if (isDisposableEmail(email)) {
    return new Response(JSON.stringify({ error: 'Disposable email addresses are not allowed' }), { status: 400 });
  }

  if (await isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many signups. Please try again later.' }), { status: 429 });
  }

  const [existing] = await sql`SELECT id FROM waitlist WHERE email = ${email}`;
  if (existing) {
    return new Response(JSON.stringify({ error: 'This email is already on the waitlist' }), { status: 409 });
  }

  let referredBy: string | null = null;
  if (ref) {
    const [referrer] = await sql`SELECT referral_code FROM waitlist WHERE referral_code = ${ref}`;
    if (referrer) {
      referredBy = ref;
    }
  }

  const referralCode = generateReferralCode();
  const verificationToken = generateVerificationToken();
  const position = await getNextPosition();

  if (referredBy === referralCode) {
    referredBy = null;
  }

  const [entry] = await sql`
    INSERT INTO waitlist (email, referral_code, verification_token, referred_by, position, original_position, ip_address, user_agent)
    VALUES (${email}, ${referralCode}, ${verificationToken}, ${referredBy}, ${position}, ${position}, ${ip}, ${userAgent})
    RETURNING id, referral_code, position
  `;

  await sendVerificationEmail(email, verificationToken, position, entry.id);

  return new Response(
    JSON.stringify({
      success: true,
      referral_code: entry.referral_code,
      position: entry.position,
    }),
    { status: 201 },
  );
};
