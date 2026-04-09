import { Resend } from 'resend';
import sql from './db';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const SITE_URL = import.meta.env.SITE_URL || 'https://cadre.run';
const FROM = 'Cadre <hello@cadre.run>';

export async function sendVerificationEmail(
  email: string,
  token: string,
  position: number,
  waitlistId: number,
): Promise<void> {
  const verifyUrl = `${SITE_URL}/api/verify?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: 'Confirm your spot on the Cadre waitlist',
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 32px;">
          <div style="display: inline-block; width: 32px; height: 32px; background: #4F46E5; border-radius: 8px; text-align: center; line-height: 32px; color: white; font-weight: 700; font-size: 16px;">C</div>
        </div>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hey,</p>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Confirm your email to secure your spot on the Cadre waitlist:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm my email</a>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">You're currently <strong style="color: #0F172A;">#${position}</strong> on the waitlist.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 13px; margin: 0;">– The Cadre Team</p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }

  await sql`
    INSERT INTO email_log (waitlist_id, email_type, resend_id, status)
    VALUES (${waitlistId}, 'verification', ${data?.id ?? null}, 'sent')
  `;
}

export async function sendWelcomeEmail(
  email: string,
  position: number,
  referralCode: string,
  waitlistId: number,
): Promise<void> {
  const referralUrl = `${SITE_URL}?ref=${referralCode}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: `You're #${position} on the Cadre waitlist`,
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="margin-bottom: 32px;">
          <div style="display: inline-block; width: 32px; height: 32px; background: #4F46E5; border-radius: 8px; text-align: center; line-height: 32px; color: white; font-weight: 700; font-size: 16px;">C</div>
        </div>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">You're confirmed. Here's your spot: <strong>#${position}</strong></p>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Want to move up? Share your personal link:</p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; font-family: 'JetBrains Mono', monospace; font-size: 14px; word-break: break-all; color: #4F46E5; margin: 0 0 16px;">${referralUrl}</div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">Every signup through your link moves you one spot up.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 13px; margin: 0;">– The Cadre Team</p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send welcome email:', error);
    throw new Error('Failed to send welcome email');
  }

  await sql`
    INSERT INTO email_log (waitlist_id, email_type, resend_id, status)
    VALUES (${waitlistId}, 'welcome', ${data?.id ?? null}, 'sent')
  `;
}
