import type { Sql } from 'postgres';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'temp-mail.org', 'fakeinbox.com',
  'mailnesia.com', 'maildrop.cc', 'discard.email', 'tempail.com',
  'mohmal.com', 'burnermail.io', 'getnada.com', '10minutemail.com',
]);

export function generateReferralCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = 'cdr_';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

export async function getNextPosition(sql: Sql): Promise<number> {
  const [result] = await sql`SELECT COALESCE(MAX(position), 0) + 1 AS next FROM waitlist`;
  return result.next;
}

export async function creditReferral(sql: Sql, referrerCode: string, referredEmail: string, ip: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [referrer] = await tx`
      SELECT id, position FROM waitlist
      WHERE referral_code = ${referrerCode} AND email_verified = TRUE
    `;
    if (!referrer) return;

    const newPosition = Math.max(1, referrer.position - 1);

    if (newPosition < referrer.position) {
      await tx`
        UPDATE waitlist
        SET position = position + 1, updated_at = NOW()
        WHERE position >= ${newPosition}
          AND position < ${referrer.position}
          AND id != ${referrer.id}
      `;

      await tx`
        UPDATE waitlist
        SET position = ${newPosition}, referral_count = referral_count + 1, updated_at = NOW()
        WHERE id = ${referrer.id}
      `;
    } else {
      await tx`
        UPDATE waitlist
        SET referral_count = referral_count + 1, updated_at = NOW()
        WHERE id = ${referrer.id}
      `;
    }

    await tx`
      INSERT INTO referral_events (referrer_code, referred_email, ip_address)
      VALUES (${referrerCode}, ${referredEmail}, ${ip})
    `;
  });
}
