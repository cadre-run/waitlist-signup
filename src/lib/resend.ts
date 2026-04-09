import { Resend } from 'resend';
import type { Sql } from 'postgres';

function getResend(env?: Record<string, any>) {
  const apiKey = env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
  return new Resend(apiKey);
}

function getSiteUrl(env?: Record<string, any>) {
  return env?.SITE_URL || import.meta.env.SITE_URL || 'https://cadre.run';
}

const FROM = 'Cadre <hello@cadre.run>';

// Shared email wrapper
function emailLayout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #F8FAFC; font-family: 'Inter', -apple-system, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F8FAFC; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td style="padding: 0 24px 32px;">
              <a href="https://cadre.run" style="text-decoration: none;">
                <img src="https://cadre.run/images/logo-wordmark.svg" alt="Cadre" width="120" height="40" style="display: block; height: 40px; width: auto;" />
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="padding: 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden;">
                <tr>
                  <td style="padding: 36px 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 24px 0; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #94A3B8;">
                <a href="https://x.com/runcadre" style="color: #94A3B8; text-decoration: none;">X (Twitter)</a>
                &nbsp;&middot;&nbsp;
                <a href="https://cadre.run" style="color: #94A3B8; text-decoration: none;">cadre.run</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">
                Built in Germany &middot; Powered by Paperclip (MIT)<br>
                &copy; 2026 Cadre
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  sql: Sql,
  email: string,
  token: string,
  position: number,
  waitlistId: number,
  env?: Record<string, any>,
): Promise<void> {
  const resend = getResend(env);
  const siteUrl = getSiteUrl(env);
  const verifyUrl = `${siteUrl}/api/verify?token=${token}`;

  const content = `
    <p style="color: #0F172A; font-size: 20px; font-weight: 600; line-height: 1.3; margin: 0 0 8px; letter-spacing: -0.3px;">Confirm your spot</p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">One click to secure your position on the Cadre waitlist.</p>

    <!-- Position badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Your position</p>
          <p style="margin: 0; font-size: 42px; font-weight: 700; color: #4F46E5; letter-spacing: -2px;">#${position}</p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: -0.2px;">Confirm my email</a>
        </td>
      </tr>
    </table>

    <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
      If you didn't sign up for Cadre, you can ignore this email.
    </p>`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: `Confirm your spot – You're #${position} on the Cadre waitlist`,
    html: emailLayout(content),
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
  sql: Sql,
  email: string,
  position: number,
  referralCode: string,
  waitlistId: number,
  env?: Record<string, any>,
): Promise<void> {
  const resend = getResend(env);
  const siteUrl = getSiteUrl(env);
  const referralUrl = `${siteUrl}/r/${referralCode}`;
  const welcomeUrl = `${siteUrl}/welcome?code=${referralCode}&verified=true`;

  const content = `
    <p style="color: #0F172A; font-size: 20px; font-weight: 600; line-height: 1.3; margin: 0 0 8px; letter-spacing: -0.3px;">You're confirmed!</p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">Welcome to the Cadre waitlist. Here's everything you need.</p>

    <!-- Position badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background: linear-gradient(135deg, #EEF2FF, #F5F3FF); border: 1px solid #E0E7FF; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 13px; color: #6366F1; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Your position</p>
          <p style="margin: 0; font-size: 42px; font-weight: 700; color: #4F46E5; letter-spacing: -2px;">#${position}</p>
        </td>
      </tr>
    </table>

    <!-- Referral section -->
    <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 8px;">Move up the list</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Every signup through your link moves you one spot up.</p>

    <!-- Referral link box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; word-break: break-all; color: #4F46E5;">${referralUrl}</td>
      </tr>
    </table>

    <!-- CTA Buttons -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom: 12px;">
          <a href="${welcomeUrl}" style="display: inline-block; background: #4F46E5; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">View your dashboard</a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <a href="https://x.com/intent/tweet?text=${encodeURIComponent(`I'm #${position} on the @runcadre waitlist. Your AI team, deployed in minutes.\n\nJoin → ${referralUrl}`)}" style="display: inline-block; color: #4F46E5; padding: 10px 24px; border-radius: 10px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #E2E8F0;">Share on X</a>
        </td>
      </tr>
    </table>`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject: `You're #${position} on the Cadre waitlist`,
    html: emailLayout(content),
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
