# Cadre Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **IMPORTANT: Frontend tasks (Tasks 11-18) MUST use `ui-ux-pro-max` and `frontend-design` skills directly. NO subagent dispatching for design/frontend work.**

**Goal:** Build a waitlist landing page with referral system for cadre.run – Astro SSR on Cloudflare Pages, Postgres on Hetzner, Resend for email, Satori for badge generation.

**Architecture:** Astro in `output: 'server'` mode with Cloudflare adapter. Landing page is prerendered (static). Welcome page and API routes are SSR. Postgres via postgres.js (connection string from ENV, Hyperdrive-compatible). Resend SDK for transactional email. Satori + resvg for dynamic badge PNG generation.

**Tech Stack:** Astro 5, @astrojs/cloudflare, @astrojs/tailwind, postgres.js, resend, satori, @resvg/resvg-js, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-09-cadre-waitlist-design.md`

---

## File Map

### Create

| File | Responsibility |
|---|---|
| `astro.config.mjs` | Astro config: Cloudflare adapter, Tailwind integration |
| `tailwind.config.mjs` | Tailwind config: design tokens, fonts |
| `tsconfig.json` | TypeScript config |
| `.env.example` | Environment variable template |
| `src/styles/global.css` | Tailwind directives + custom tokens |
| `src/layouts/BaseLayout.astro` | HTML shell, meta tags, fonts, OG defaults |
| `src/lib/db.ts` | Postgres client (connection via ENV) |
| `src/lib/resend.ts` | Resend client + email sending functions |
| `src/lib/referral.ts` | Referral code gen, position recalculation, disposable email check |
| `src/lib/rate-limit.ts` | IP-based rate limiting |
| `src/pages/index.astro` | Landing page (prerendered, assembles all sections) |
| `src/pages/welcome.astro` | Thank-you page (SSR, loads user data) |
| `src/pages/api/signup.ts` | POST: signup endpoint |
| `src/pages/api/verify.ts` | GET: email verification endpoint |
| `src/pages/api/stats.ts` | GET: waitlist counter |
| `src/pages/api/survey.ts` | PATCH: survey submission |
| `src/pages/api/position/[code].ts` | GET: user position lookup |
| `src/pages/api/badge/[code].png.ts` | GET: dynamic badge image |
| `src/components/Hero.astro` | Hero section |
| `src/components/PainSolution.astro` | Pain → Solution cards |
| `src/components/HowItWorks.astro` | 3-step process |
| `src/components/Features.astro` | v1 features + roadmap |
| `src/components/UseCases.astro` | 4 persona cards |
| `src/components/Comparison.astro` | Self-host vs Cadre table |
| `src/components/FAQ.astro` | Accordion FAQ |
| `src/components/FinalCTA.astro` | Closing CTA section |
| `src/components/Footer.astro` | Footer |
| `src/components/SignupForm.astro` | Reusable email input + button (client-side JS) |
| `src/components/WaitlistBadge.astro` | Badge preview on welcome page |
| `db/schema.sql` | Database schema (run manually on Hetzner Postgres) |
| `db/seed.sql` | Optional test data |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `.env.example`, `src/styles/global.css`, `.gitignore`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /Users/noahkellner/00_elevenworks/cadre/waitlist_signup
npm create astro@latest . -- --template minimal --install --no-git --typescript strict
```

- [ ] **Step 2: Install dependencies**

```bash
npx astro add cloudflare tailwind --yes
npm install postgres resend satori @resvg/resvg-js
```

- [ ] **Step 3: Configure Astro**

Replace `astro.config.mjs` with:

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://cadre.run',
  output: 'server',
  adapter: cloudflare(),
  integrations: [tailwind()],
});
```

- [ ] **Step 4: Configure Tailwind**

Replace `tailwind.config.mjs` with:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        surface: '#F8FAFC',
        'accent-warm': '#F59E0B',
        'accent-peach': '#FDE8D8',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        heading: '-0.04em',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create global CSS**

Write `src/styles/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply text-text-primary font-sans antialiased;
    font-size: 16px;
    line-height: 1.6;
  }

  h1, h2, h3, h4 {
    @apply font-semibold tracking-heading;
  }
}
```

- [ ] **Step 6: Create .env.example**

Write `.env.example`:

```
DATABASE_URL=postgresql://user:pass@host:5432/cadre_waitlist
RESEND_API_KEY=re_xxxxx
SITE_URL=https://cadre.run
```

- [ ] **Step 7: Create .gitignore**

Write `.gitignore`:

```
node_modules/
dist/
.astro/
.env
.wrangler/
```

- [ ] **Step 8: Verify build**

```bash
npx astro check
npx astro build
```

Expected: Build succeeds (may warn about missing pages – that's fine).

- [ ] **Step 9: Init git and commit**

```bash
git init
git add .
git commit -m "feat: scaffold Astro project with Cloudflare + Tailwind"
```

---

## Task 2: Database Schema & Client

**Files:**
- Create: `db/schema.sql`, `src/lib/db.ts`

- [ ] **Step 1: Write database schema**

Write `db/schema.sql`:

```sql
CREATE TABLE waitlist (
  id                SERIAL PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  email_verified    BOOLEAN DEFAULT FALSE,
  verification_token TEXT UNIQUE,
  referral_code     TEXT UNIQUE NOT NULL,
  referred_by       TEXT REFERENCES waitlist(referral_code),
  referral_count    INTEGER DEFAULT 0,
  position          INTEGER NOT NULL,
  original_position INTEGER NOT NULL,
  survey_usecase    TEXT,
  survey_hosting    TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  unsubscribed      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_events (
  id              SERIAL PRIMARY KEY,
  referrer_code   TEXT NOT NULL REFERENCES waitlist(referral_code),
  referred_email  TEXT NOT NULL REFERENCES waitlist(email),
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_code, referred_email)
);

CREATE TABLE email_log (
  id              SERIAL PRIMARY KEY,
  waitlist_id     INTEGER NOT NULL REFERENCES waitlist(id),
  email_type      TEXT NOT NULL,
  resend_id       TEXT,
  status          TEXT DEFAULT 'sent',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);
CREATE INDEX idx_waitlist_position ON waitlist(position);
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_verified ON waitlist(email_verified);
CREATE INDEX idx_referral_events_referrer ON referral_events(referrer_code);
CREATE INDEX idx_email_log_waitlist ON email_log(waitlist_id);
```

- [ ] **Step 2: Write database client**

Write `src/lib/db.ts`:

```typescript
import postgres from 'postgres';

const sql = postgres(import.meta.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;
```

- [ ] **Step 3: Commit**

```bash
git add db/schema.sql src/lib/db.ts
git commit -m "feat: add database schema and postgres client"
```

---

## Task 3: Referral & Utility Library

**Files:**
- Create: `src/lib/referral.ts`, `src/lib/rate-limit.ts`

- [ ] **Step 1: Write referral utilities**

Write `src/lib/referral.ts`:

```typescript
import sql from './db';

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
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

export async function getNextPosition(): Promise<number> {
  const [result] = await sql`SELECT COALESCE(MAX(position), 0) + 1 AS next FROM waitlist`;
  return result.next;
}

export async function creditReferral(referrerCode: string, referredEmail: string, ip: string): Promise<void> {
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
```

- [ ] **Step 2: Write rate limiter**

Write `src/lib/rate-limit.ts`:

```typescript
import sql from './db';

const RATE_LIMIT = 3;
const WINDOW_HOURS = 1;

export async function isRateLimited(ip: string): Promise<boolean> {
  const [result] = await sql`
    SELECT COUNT(*) AS cnt FROM waitlist
    WHERE ip_address = ${ip}
      AND created_at > NOW() - INTERVAL '${sql.unsafe(String(WINDOW_HOURS))} hours'
  `;
  return Number(result.cnt) >= RATE_LIMIT;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/referral.ts src/lib/rate-limit.ts
git commit -m "feat: add referral utilities and rate limiting"
```

---

## Task 4: Resend Email Integration

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: Write Resend client and email functions**

Write `src/lib/resend.ts`:

```typescript
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
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6;">Hey,</p>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6;">Confirm your email to secure your spot:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0;">Confirm my email</a>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">You're currently <strong>#${position}</strong> on the waitlist.</p>
        <p style="color: #475569; font-size: 14px; margin-top: 32px;">– The Cadre Team</p>
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
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6;">You're confirmed. Here's your spot: <strong>#${position}</strong></p>
        <p style="color: #0F172A; font-size: 16px; line-height: 1.6;">Want to move up? Share your personal link:</p>
        <p style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 14px; word-break: break-all;">${referralUrl}</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">Every signup through your link moves you one spot up.</p>
        <p style="color: #475569; font-size: 14px; margin-top: 32px;">– The Cadre Team</p>
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

// Future email templates (not built in v1):
// - Day 3-4: "Here's what we're building" – Loom/GIF, behind-the-scenes
// - Day 7-10: Roadmap update, community invite, referral reminder
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/resend.ts
git commit -m "feat: add Resend email integration with verification and welcome emails"
```

---

## Task 5: Signup API Endpoint

**Files:**
- Create: `src/pages/api/signup.ts`

- [ ] **Step 1: Write signup endpoint**

Write `src/pages/api/signup.ts`:

```typescript
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

  // Self-referral check
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/signup.ts
git commit -m "feat: add signup API endpoint with validation and email verification"
```

---

## Task 6: Verify API Endpoint

**Files:**
- Create: `src/pages/api/verify.ts`

- [ ] **Step 1: Write verification endpoint**

Write `src/pages/api/verify.ts`:

```typescript
import type { APIRoute } from 'astro';
import sql from '../../lib/db';
import { creditReferral } from '../../lib/referral';
import { sendWelcomeEmail } from '../../lib/resend';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

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
    return Response.redirect(`${import.meta.env.SITE_URL || 'https://cadre.run'}/welcome?code=${entry.referral_code}&verified=true`, 302);
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

  // Re-fetch position (may have changed due to referral crediting of others)
  const [updated] = await sql`SELECT position FROM waitlist WHERE id = ${entry.id}`;

  await sendWelcomeEmail(entry.email, updated.position, entry.referral_code, entry.id);

  const siteUrl = import.meta.env.SITE_URL || 'https://cadre.run';
  return Response.redirect(`${siteUrl}/welcome?code=${entry.referral_code}&verified=true`, 302);
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/verify.ts
git commit -m "feat: add email verification endpoint with referral crediting"
```

---

## Task 7: Stats, Survey & Position Endpoints

**Files:**
- Create: `src/pages/api/stats.ts`, `src/pages/api/survey.ts`, `src/pages/api/position/[code].ts`

- [ ] **Step 1: Write stats endpoint**

Write `src/pages/api/stats.ts`:

```typescript
import type { APIRoute } from 'astro';
import sql from '../../lib/db';

export const GET: APIRoute = async () => {
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
```

- [ ] **Step 2: Write survey endpoint**

Write `src/pages/api/survey.ts`:

```typescript
import type { APIRoute } from 'astro';
import sql from '../../lib/db';

const VALID_USECASES = ['Content Agency', 'Lead Research', 'Back-Office Automation', 'DMS', 'Code Review', 'Other'];
const VALID_HOSTING = ['Hetzner', 'Netcup', 'DigitalOcean', 'AWS', 'Other', 'None yet'];

export const PATCH: APIRoute = async ({ request }) => {
  let body: { referral_code?: string; usecase?: string; hosting?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const { referral_code, usecase, hosting } = body;

  if (!referral_code) {
    return new Response(JSON.stringify({ error: 'Missing referral_code' }), { status: 400 });
  }

  if (usecase && !VALID_USECASES.includes(usecase)) {
    return new Response(JSON.stringify({ error: 'Invalid use case' }), { status: 400 });
  }

  if (hosting && !VALID_HOSTING.includes(hosting)) {
    return new Response(JSON.stringify({ error: 'Invalid hosting provider' }), { status: 400 });
  }

  const [entry] = await sql`
    UPDATE waitlist
    SET
      survey_usecase = COALESCE(${usecase ?? null}, survey_usecase),
      survey_hosting = COALESCE(${hosting ?? null}, survey_hosting),
      updated_at = NOW()
    WHERE referral_code = ${referral_code}
    RETURNING id
  `;

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

- [ ] **Step 3: Write position endpoint**

Write `src/pages/api/position/[code].ts`:

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/stats.ts src/pages/api/survey.ts src/pages/api/position/
git commit -m "feat: add stats, survey, and position API endpoints"
```

---

## Task 8: Badge Generation Endpoint

**Files:**
- Create: `src/pages/api/badge/[code].png.ts`

- [ ] **Step 1: Write badge generation endpoint**

Write `src/pages/api/badge/[code].png.ts`:

```typescript
import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sql from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { code } = params;

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const [entry] = await sql`
    SELECT position FROM waitlist WHERE referral_code = ${code}
  `;

  if (!entry) {
    return new Response('Not found', { status: 404 });
  }

  // Fetch Inter font for Satori
  const fontResponse = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKv0.woff');
  const fontData = await fontResponse.arrayBuffer();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0F172A',
          padding: '80px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                backgroundColor: '#4F46E5',
                marginBottom: '48px',
                fontSize: '36px',
                fontWeight: 700,
                color: '#FFFFFF',
              },
              children: 'C',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '160px',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
                marginBottom: '32px',
              },
              children: `#${entry.position}`,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '28px',
                color: '#94A3B8',
                marginBottom: '16px',
              },
              children: "I'm on the Cadre waitlist.",
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '20px',
                color: '#64748B',
              },
              children: 'cadre.run',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 1200,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/badge/
git commit -m "feat: add dynamic badge PNG generation with Satori"
```

---

## Task 9: Base Layout

**Files:**
- Create: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Write base layout**

Write `src/layouts/BaseLayout.astro`:

```astro
---
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
}

const {
  title = 'Cadre – Your AI Team, Deployed in Minutes',
  description = 'Cadre provisions a fully isolated AI company on your server. Optimized prompts, Gemini CLI ready, zero Docker headaches. Join the waitlist.',
  ogImage = '/images/og-default.png',
} = Astro.props;

const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(ogImage, Astro.site)} />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={new URL(ogImage, Astro.site)} />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-white">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: add base layout with meta tags, OG, fonts"
```

---

## Task 10: SignupForm Component

**Files:**
- Create: `src/components/SignupForm.astro`

- [ ] **Step 1: Write signup form component**

> **IMPORTANT:** Use `ui-ux-pro-max` and `frontend-design` skills when implementing this component for design quality.

Write `src/components/SignupForm.astro`:

```astro
---
interface Props {
  variant?: 'hero' | 'final';
}

const { variant = 'hero' } = Astro.props;
const isHero = variant === 'hero';
---

<div class="w-full max-w-md" data-signup-form>
  <form class="flex flex-col sm:flex-row gap-3" id="signup-form">
    <input
      type="email"
      name="email"
      placeholder="you@company.com"
      required
      class:list={[
        'flex-1 px-4 py-3 rounded-lg border text-base outline-none transition-colors',
        isHero
          ? 'border-border bg-white focus:border-primary'
          : 'border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40',
      ]}
    />
    <button
      type="submit"
      class:list={[
        'px-6 py-3 rounded-lg font-semibold text-base transition-colors whitespace-nowrap cursor-pointer',
        isHero
          ? 'bg-primary text-white hover:bg-primary-hover'
          : 'bg-white text-primary hover:bg-white/90',
      ]}
    >
      Get Early Access
    </button>
  </form>

  <p class="hidden mt-3 text-sm text-red-500" data-error></p>
  <p class="hidden mt-3 text-sm" data-success>
    <span class:list={[isHero ? 'text-text-secondary' : 'text-white/70']}>
      Check your inbox to confirm your email!
    </span>
  </p>

  <p class:list={['mt-3 text-sm', isHero ? 'text-text-secondary' : 'text-white/70']} data-counter>
    Join <span data-count>…</span> others on the waitlist · No spam, ever.
  </p>
</div>

<script>
  const forms = document.querySelectorAll('[data-signup-form]');

  // Load counter
  fetch('/api/stats')
    .then((r) => r.json())
    .then((data) => {
      document.querySelectorAll('[data-count]').forEach((el) => {
        el.textContent = data.total_signups || '0';
      });
    })
    .catch(() => {
      document.querySelectorAll('[data-count]').forEach((el) => {
        el.textContent = '0';
      });
    });

  forms.forEach((wrapper) => {
    const form = wrapper.querySelector('form') as HTMLFormElement;
    const errorEl = wrapper.querySelector('[data-error]') as HTMLElement;
    const successEl = wrapper.querySelector('[data-success]') as HTMLElement;
    const counterEl = wrapper.querySelector('[data-counter]') as HTMLElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.classList.add('hidden');
      successEl.classList.add('hidden');

      const formData = new FormData(form);
      const email = formData.get('email') as string;

      // Read ref from URL
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');

      const button = form.querySelector('button') as HTMLButtonElement;
      button.disabled = true;
      button.textContent = 'Joining…';

      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, ref }),
        });

        const data = await res.json();

        if (!res.ok) {
          errorEl.textContent = data.error || 'Something went wrong. Please try again.';
          errorEl.classList.remove('hidden');
          button.disabled = false;
          button.textContent = 'Get Early Access';
          return;
        }

        // Success – redirect to welcome page
        window.location.href = `/welcome?code=${data.referral_code}`;
      } catch {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.classList.remove('hidden');
        button.disabled = false;
        button.textContent = 'Get Early Access';
      }
    });
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SignupForm.astro
git commit -m "feat: add signup form component with client-side validation"
```

---

## Task 11: Landing Page Section Components (Part 1: Hero, PainSolution, HowItWorks)

> **IMPORTANT:** Use `ui-ux-pro-max` and `frontend-design` skills for all component styling.

**Files:**
- Create: `src/components/Hero.astro`, `src/components/PainSolution.astro`, `src/components/HowItWorks.astro`

- [ ] **Step 1: Write Hero component**

Write `src/components/Hero.astro`:

```astro
---
import SignupForm from './SignupForm.astro';
---

<section class="relative overflow-hidden bg-white">
  <div class="mx-auto max-w-7xl px-6 py-24 lg:py-32">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <!-- Text -->
      <div>
        <h1 class="text-5xl lg:text-6xl font-semibold tracking-heading text-text-primary leading-[1.1]">
          Your AI team, deployed in minutes.
        </h1>
        <p class="mt-6 text-lg text-text-secondary max-w-lg">
          Cadre provisions a fully isolated AI company on your own server. Pre-optimized prompts, Gemini CLI ready, hardened infrastructure. You log in and start working.
        </p>
        <div class="mt-8">
          <SignupForm variant="hero" />
        </div>
        <div class="mt-8 flex flex-wrap gap-6 text-sm text-text-secondary">
          <span>🇪🇺 GDPR Compliant</span>
          <span>🔒 Your Server, Your Data</span>
          <span>⚡ Setup &lt; 5 min</span>
        </div>
      </div>

      <!-- Visual -->
      <div class="relative">
        <img
          src="/images/hero-org-chart.png"
          alt="AI team organizational chart visualization"
          class="w-full rounded-2xl"
          width="640"
          height="360"
          loading="eager"
        />
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Write PainSolution component**

Write `src/components/PainSolution.astro`:

```astro
---
const cards = [
  {
    pain: 'Docker + VPS + .env = hours of debugging',
    solution: 'Fill out a form. Your server is provisioned, hardened, ready.',
    metric: 'Setup time: under 5 minutes',
    iconFrom: '▸_',
    iconTo: '✓',
  },
  {
    pain: 'AI agents burn through tokens like there\'s no tomorrow',
    solution: 'Pre-optimized prompting system. Same output, fraction of the cost.',
    metric: 'Up to 60% fewer tokens per task',
    iconFrom: '🔥',
    iconTo: '❄️',
  },
  {
    pain: 'No visibility into what your agents actually do and cost',
    solution: 'Dashboard with heartbeats, budgets, department controls, live status.',
    metric: 'Real-time cost tracking per agent',
    iconFrom: '?',
    iconTo: '▦',
  },
];
---

<section class="bg-surface py-24">
  <div class="mx-auto max-w-7xl px-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {cards.map((card) => (
        <div class="bg-white rounded-2xl border border-border p-8">
          <div class="flex items-center gap-3 text-2xl mb-6">
            <span class="opacity-40">{card.iconFrom}</span>
            <span class="text-text-secondary text-base">→</span>
            <span>{card.iconTo}</span>
          </div>
          <p class="text-text-secondary line-through mb-3">{card.pain}</p>
          <p class="text-text-primary font-semibold mb-4">{card.solution}</p>
          <p class="text-sm text-primary font-medium">{card.metric}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Write HowItWorks component**

Write `src/components/HowItWorks.astro`:

```astro
---
const steps = [
  {
    number: '01',
    title: 'Choose your infrastructure',
    description: 'Pick your hosting provider – Hetzner, Netcup, or DigitalOcean. Select your VPS size. Done.',
    image: '/images/step-01-providers.png',
  },
  {
    number: '02',
    title: 'Configure your AI company',
    description: 'Define departments, assign roles, set budgets. Our intake form handles your entire .env and first setup.',
    image: '/images/step-02-glass-cards.png',
  },
  {
    number: '03',
    title: 'Log in and go',
    description: 'Your server is provisioned, secured, and running. Log in to your Cadre dashboard and start delegating to your AI team.',
    image: '/images/step-03-dashboard.png',
  },
];
---

<section class="bg-white py-24">
  <div class="mx-auto max-w-7xl px-6">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-text-primary text-center mb-16">
      How it works
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
      {steps.map((step, i) => (
        <div class="relative">
          {i < steps.length - 1 && (
            <div class="hidden md:block absolute top-8 left-full w-12 h-px bg-border -translate-x-6" />
          )}
          <span class="text-5xl font-semibold text-primary/20">{step.number}</span>
          <h3 class="mt-4 text-xl font-semibold text-text-primary">{step.title}</h3>
          <p class="mt-2 text-text-secondary">{step.description}</p>
          <img
            src={step.image}
            alt={step.title}
            class="mt-6 w-full rounded-xl border border-border"
            width="400"
            height="300"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.astro src/components/PainSolution.astro src/components/HowItWorks.astro
git commit -m "feat: add Hero, PainSolution, HowItWorks landing page sections"
```

---

## Task 12: Landing Page Section Components (Part 2: Features, UseCases, Comparison)

> **IMPORTANT:** Use `ui-ux-pro-max` and `frontend-design` skills for all component styling.

**Files:**
- Create: `src/components/Features.astro`, `src/components/UseCases.astro`, `src/components/Comparison.astro`

- [ ] **Step 1: Write Features component**

Write `src/components/Features.astro`:

```astro
---
const v1Features = [
  'Automated server provisioning (Hetzner, Netcup, DigitalOcean)',
  'Server hardening (SSH, Firewall, Fail2ban, auto-updates)',
  'Containerized Paperclip (Docker Compose, production-ready)',
  'Pre-optimized prompting system',
  'Gemini CLI integration (subscription-based)',
  'Department-based RBAC',
  'Agent heartbeat monitoring & cost tracking',
];

const roadmapFeatures = [
  'Vision Board',
  'Agentic DMS Module',
  'Integration Hub / Module Marketplace',
  'HR Module',
  'Automated backups & monitoring dashboard',
  'Multi-provider agent support expansion',
];
---

<section class="bg-surface py-24">
  <div class="mx-auto max-w-7xl px-6">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-text-primary text-center mb-16">
      What you get
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
      <!-- v1 -->
      <div>
        <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">Live</span>
          Included in v1
        </h3>
        <ul class="space-y-4">
          {v1Features.map((feature) => (
            <li class="flex items-start gap-3">
              <span class="text-primary mt-0.5 font-bold">✓</span>
              <span class="text-text-primary">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <!-- Roadmap -->
      <div>
        <h3 class="text-lg font-semibold text-text-secondary mb-6 flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-border text-text-secondary">Coming</span>
          On the Roadmap
        </h3>
        <ul class="space-y-4">
          {roadmapFeatures.map((feature) => (
            <li class="flex items-start gap-3 opacity-60">
              <span class="text-text-secondary mt-0.5">○</span>
              <span class="text-text-secondary">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Write UseCases component**

Write `src/components/UseCases.astro`:

```astro
---
const useCases = [
  {
    persona: 'Solopreneur / Indie Hacker',
    description: 'You want an AI Content Team that researches, writes, and publishes for you – without DevOps knowledge.',
    before: '3 hours Docker debugging, $200 wasted API calls',
    after: 'Login, configure departments, content pipeline runs',
  },
  {
    persona: 'Agency / Small Team',
    description: 'You\'re a 3-5 person agency and want to delegate repetitive client work (Lead Research, Reporting, Outreach) to AI agents.',
    before: 'Manually managing VAs, inconsistent quality',
    after: 'Standardized AI departments per client, consistent output',
  },
  {
    persona: 'SMB / Mittelstand',
    description: 'Your company wants AI automations for back-office (DMS, Bookkeeping, Classification) without building AI infrastructure.',
    before: '6-month AI project, external consultant, unclear results',
    after: 'Cadre provisioned, DMS module active, agents running',
  },
  {
    persona: 'Developer / Builder',
    description: 'You know Paperclip, you\'ve tried it, but you don\'t want to debug Docker problems every day.',
    before: 'Setup works, but every update breaks something',
    after: 'Managed infrastructure, you focus on agent configuration',
  },
];
---

<section class="bg-white py-24">
  <div class="mx-auto max-w-7xl px-6">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-text-primary text-center mb-16">
      Who it's for
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      {useCases.map((uc) => (
        <div class="rounded-2xl border border-border p-8">
          <h3 class="text-lg font-semibold text-text-primary mb-2">{uc.persona}</h3>
          <p class="text-text-secondary mb-6">{uc.description}</p>
          <div class="space-y-3 text-sm">
            <div class="flex items-start gap-3">
              <span class="text-red-400 font-medium shrink-0">Before:</span>
              <span class="text-text-secondary">{uc.before}</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-primary font-medium shrink-0">After:</span>
              <span class="text-text-primary">{uc.after}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Write Comparison component**

Write `src/components/Comparison.astro`:

```astro
---
const rows = [
  { label: 'Setup Time', self: 'Hours–Days', cadre: '< 5 Minutes' },
  { label: 'Docker/DevOps Knowledge', self: 'Required', cadre: 'Not needed' },
  { label: 'Token Optimization', self: 'DIY', cadre: 'Pre-configured' },
  { label: 'Gemini CLI (Subscription)', self: 'Manual setup', cadre: 'Ready out of the box' },
  { label: 'Server Hardening', self: 'Your responsibility', cadre: 'Automated' },
  { label: 'Department RBAC', self: 'Basic', cadre: 'Granular' },
  { label: 'Monitoring', self: 'Build yourself', cadre: 'Built-in Dashboard' },
  { label: 'Modules (DMS, HR etc.)', self: 'Not available', cadre: 'Coming via Module Hub' },
  { label: 'GDPR', self: 'Your problem', cadre: 'Built-in compliance' },
];
---

<section class="bg-surface py-24">
  <div class="mx-auto max-w-7xl px-6">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-text-primary text-center mb-16">
      Built different
    </h2>
    <div class="max-w-3xl mx-auto overflow-hidden rounded-2xl border border-border bg-white">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-border">
            <th class="p-4 text-sm font-medium text-text-secondary"></th>
            <th class="p-4 text-sm font-medium text-text-secondary">Self-Host</th>
            <th class="p-4 text-sm font-medium text-primary">Cadre</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr class:list={[i < rows.length - 1 && 'border-b border-border']}>
              <td class="p-4 text-sm font-medium text-text-primary">{row.label}</td>
              <td class="p-4 text-sm text-text-secondary">{row.self}</td>
              <td class="p-4 text-sm text-text-primary font-medium">{row.cadre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Features.astro src/components/UseCases.astro src/components/Comparison.astro
git commit -m "feat: add Features, UseCases, Comparison landing page sections"
```

---

## Task 13: Landing Page Section Components (Part 3: FAQ, FinalCTA, Footer)

> **IMPORTANT:** Use `ui-ux-pro-max` and `frontend-design` skills for all component styling.

**Files:**
- Create: `src/components/FAQ.astro`, `src/components/FinalCTA.astro`, `src/components/Footer.astro`

- [ ] **Step 1: Write FAQ component**

Write `src/components/FAQ.astro`:

```astro
---
const faqs = [
  {
    q: 'Do I need my own API keys?',
    a: 'Yes, you bring your own Gemini CLI subscription (or other providers). Cadre doesn\'t charge for tokens – you only pay for infrastructure management.',
  },
  {
    q: 'Where does my data live?',
    a: 'On your own server, with the hosting provider you choose. Cadre provisions and manages the infrastructure but doesn\'t store your data.',
  },
  {
    q: 'Is this based on Paperclip?',
    a: 'Cadre builds on Paperclip\'s open-source foundation (MIT licensed) with significant enhancements: optimized prompting, Gemini CLI integration, server hardening, and an upcoming module system.',
  },
  {
    q: 'What does it cost?',
    a: 'Pricing is not finalized yet. Join the waitlist to get founding member pricing when we launch. You\'ll only pay for infrastructure – no per-token markup.',
  },
  {
    q: 'Can I migrate from my existing Paperclip setup?',
    a: 'Yes. We\'ll offer a migration path for existing self-hosted setups. Details coming with the beta launch.',
  },
];
---

<section class="bg-white py-24">
  <div class="mx-auto max-w-3xl px-6">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-text-primary text-center mb-16">
      Frequently asked questions
    </h2>
    <div class="divide-y divide-border">
      {faqs.map((faq) => (
        <details class="group py-6">
          <summary class="flex items-center justify-between cursor-pointer list-none">
            <span class="text-lg font-medium text-text-primary">{faq.q}</span>
            <span class="ml-4 text-text-secondary transition-transform group-open:rotate-45 text-xl">+</span>
          </summary>
          <p class="mt-4 text-text-secondary leading-relaxed">{faq.a}</p>
        </details>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Write FinalCTA component**

Write `src/components/FinalCTA.astro`:

```astro
---
import SignupForm from './SignupForm.astro';
---

<section class="bg-gradient-to-br from-primary to-primary-hover py-24">
  <div class="mx-auto max-w-3xl px-6 text-center">
    <h2 class="text-3xl lg:text-4xl font-semibold tracking-heading text-white mb-4">
      Your AI team is waiting.
    </h2>
    <p class="text-lg text-white/70 mb-8">
      Join the waitlist. Be first when Cadre launches.
    </p>
    <div class="flex justify-center">
      <SignupForm variant="final" />
    </div>
    <p class="mt-6 text-sm text-white/50">
      🔒 No spam. Unsubscribe anytime. We'll only email you about launch updates.
    </p>
  </div>
</section>
```

- [ ] **Step 3: Write Footer component**

Write `src/components/Footer.astro`:

```astro
<footer class="bg-white border-t border-border py-12">
  <div class="mx-auto max-w-7xl px-6">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <!-- Logo -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
        <span class="font-semibold text-text-primary">Cadre</span>
      </div>

      <!-- Links -->
      <div class="flex items-center gap-6 text-sm text-text-secondary">
        <a href="/privacy" class="hover:text-text-primary transition-colors">Privacy Policy</a>
        <a href="/terms" class="hover:text-text-primary transition-colors">Terms</a>
        <a href="https://x.com/cadre" target="_blank" rel="noopener" class="hover:text-text-primary transition-colors">X</a>
      </div>

      <!-- Info -->
      <div class="text-sm text-text-secondary text-center md:text-right">
        <p>Built in Germany 🇩🇪 · Powered by Paperclip (MIT)</p>
        <p class="mt-1">&copy; 2026 Cadre</p>
      </div>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/FAQ.astro src/components/FinalCTA.astro src/components/Footer.astro
git commit -m "feat: add FAQ, FinalCTA, Footer landing page sections"
```

---

## Task 14: Landing Page Assembly

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Assemble landing page**

Write `src/pages/index.astro`:

```astro
---
export const prerender = true;

import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import PainSolution from '../components/PainSolution.astro';
import HowItWorks from '../components/HowItWorks.astro';
import Features from '../components/Features.astro';
import UseCases from '../components/UseCases.astro';
import Comparison from '../components/Comparison.astro';
import FAQ from '../components/FAQ.astro';
import FinalCTA from '../components/FinalCTA.astro';
import Footer from '../components/Footer.astro';
---

<BaseLayout>
  <main>
    <Hero />
    <PainSolution />
    <HowItWorks />
    <Features />
    <UseCases />
    <Comparison />
    <FAQ />
    <FinalCTA />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Verify build**

```bash
npx astro build
```

Expected: Build succeeds. Static `index.html` is generated.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: assemble landing page with all sections"
```

---

## Task 15: Welcome Page & WaitlistBadge Component

> **IMPORTANT:** Use `ui-ux-pro-max` and `frontend-design` skills for all component styling.

**Files:**
- Create: `src/pages/welcome.astro`, `src/components/WaitlistBadge.astro`

- [ ] **Step 1: Write WaitlistBadge component**

Write `src/components/WaitlistBadge.astro`:

```astro
---
interface Props {
  code: string;
  position: number;
}

const { code, position } = Astro.props;
const badgeUrl = `/api/badge/${code}.png`;
const siteUrl = import.meta.env.SITE_URL || 'https://cadre.run';
const fullBadgeUrl = `${siteUrl}${badgeUrl}`;
---

<div class="bg-surface rounded-2xl border border-border p-6">
  <h3 class="text-lg font-semibold text-text-primary mb-4">Your waitlist badge</h3>
  <div class="bg-[#0F172A] rounded-xl overflow-hidden aspect-square max-w-[300px] mx-auto mb-4">
    <img
      src={badgeUrl}
      alt={`Waitlist position #${position}`}
      class="w-full h-full object-cover"
      width="300"
      height="300"
      loading="lazy"
    />
  </div>
  <div class="flex gap-3">
    <a
      href={fullBadgeUrl}
      download={`cadre-waitlist-${position}.png`}
      class="flex-1 text-center px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors"
    >
      Download
    </a>
    <a
      href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I'm #${position} on the @cadre waitlist. Your AI team, deployed in minutes.\n\n${siteUrl}?ref=${code}`)}`}
      target="_blank"
      rel="noopener"
      class="flex-1 text-center px-4 py-2 rounded-lg bg-text-primary text-white text-sm font-medium hover:bg-text-primary/90 transition-colors"
    >
      Share on X
    </a>
  </div>
</div>
```

- [ ] **Step 2: Write Welcome page**

Write `src/pages/welcome.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import WaitlistBadge from '../components/WaitlistBadge.astro';
import sql from '../lib/db';

const code = Astro.url.searchParams.get('code');
const verified = Astro.url.searchParams.get('verified') === 'true';

if (!code) {
  return Astro.redirect('/');
}

const [entry] = await sql`
  SELECT position, original_position, referral_code, referral_count, email_verified, survey_usecase, survey_hosting
  FROM waitlist WHERE referral_code = ${code}
`;

if (!entry) {
  return Astro.redirect('/');
}

const isVerified = entry.email_verified || verified;
const siteUrl = import.meta.env.SITE_URL || 'https://cadre.run';
const referralLink = `${siteUrl}?ref=${entry.referral_code}`;
const badgeOgUrl = `/api/badge/${entry.referral_code}.png`;

const tweetText = encodeURIComponent(`I'm #${entry.position} on the @cadre waitlist. Your AI team, deployed in minutes.\n\n${referralLink}`);
const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
const emailSubject = encodeURIComponent('Check out Cadre – AI team deployment');
const emailBody = encodeURIComponent(`I just joined the Cadre waitlist. They provision a fully isolated AI company on your own server.\n\nJoin here: ${referralLink}`);
---

<BaseLayout
  title={`You're #${entry.position} on the Cadre waitlist`}
  description="You're on the Cadre waitlist. Share your link to move up."
  ogImage={badgeOgUrl}
>
  <main class="min-h-screen bg-white">
    <div class="mx-auto max-w-2xl px-6 py-24">

      <!-- Position Header -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6">
          {isVerified ? '✓ Confirmed' : '⏳ Pending verification'}
        </div>
        <h1 class="text-4xl lg:text-5xl font-semibold tracking-heading text-text-primary">
          You're in. <span class="text-primary">#{entry.position}</span>
        </h1>
        {!isVerified && (
          <p class="mt-4 text-text-secondary">Check your inbox to confirm your email.</p>
        )}
        {entry.original_position !== entry.position && (
          <p class="mt-2 text-sm text-accent-warm">
            Started at #{entry.original_position} – moved up {entry.original_position - entry.position} spot{entry.original_position - entry.position !== 1 ? 's' : ''}!
          </p>
        )}
      </div>

      <!-- Referral Section -->
      <div class="bg-surface rounded-2xl border border-border p-8 mb-8">
        <h2 class="text-lg font-semibold text-text-primary mb-2">Move up the list</h2>
        <p class="text-text-secondary mb-6">Every signup through your link moves you one spot up.</p>

        <div class="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={referralLink}
            readonly
            class="flex-1 px-4 py-3 rounded-lg border border-border bg-white text-sm font-mono text-text-primary"
            id="referral-link"
          />
          <button
            class="px-4 py-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors whitespace-nowrap cursor-pointer"
            id="copy-btn"
          >
            Copy
          </button>
        </div>

        <div class="flex flex-wrap gap-3 mb-6">
          <a href={`https://x.com/intent/tweet?text=${tweetText}`} target="_blank" rel="noopener" class="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors">
            Share on X
          </a>
          <a href={linkedInUrl} target="_blank" rel="noopener" class="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors">
            Share on LinkedIn
          </a>
          <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`} class="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface transition-colors">
            Share via Email
          </a>
        </div>

        <p class="text-sm text-text-secondary">
          You've referred <strong class="text-text-primary">{entry.referral_count}</strong> {entry.referral_count === 1 ? 'person' : 'people'}
        </p>
      </div>

      <!-- Badge -->
      <div class="mb-8">
        <WaitlistBadge code={entry.referral_code} position={entry.position} />
      </div>

      <!-- Survey -->
      <div class="bg-surface rounded-2xl border border-border p-8 mb-8" id="survey-section">
        <h2 class="text-lg font-semibold text-text-primary mb-2">Help us build the right thing</h2>
        <p class="text-text-secondary mb-6">Two quick questions – takes 10 seconds.</p>

        <form id="survey-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">What's your primary use case?</label>
            <select name="usecase" class="w-full px-4 py-3 rounded-lg border border-border bg-white text-text-primary">
              <option value="">Select...</option>
              <option value="Content Agency" selected={entry.survey_usecase === 'Content Agency'}>Content Agency</option>
              <option value="Lead Research" selected={entry.survey_usecase === 'Lead Research'}>Lead Research</option>
              <option value="Back-Office Automation" selected={entry.survey_usecase === 'Back-Office Automation'}>Back-Office Automation</option>
              <option value="DMS" selected={entry.survey_usecase === 'DMS'}>DMS</option>
              <option value="Code Review" selected={entry.survey_usecase === 'Code Review'}>Code Review</option>
              <option value="Other" selected={entry.survey_usecase === 'Other'}>Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Which hosting provider do you use?</label>
            <select name="hosting" class="w-full px-4 py-3 rounded-lg border border-border bg-white text-text-primary">
              <option value="">Select...</option>
              <option value="Hetzner" selected={entry.survey_hosting === 'Hetzner'}>Hetzner</option>
              <option value="Netcup" selected={entry.survey_hosting === 'Netcup'}>Netcup</option>
              <option value="DigitalOcean" selected={entry.survey_hosting === 'DigitalOcean'}>DigitalOcean</option>
              <option value="AWS" selected={entry.survey_hosting === 'AWS'}>AWS</option>
              <option value="Other" selected={entry.survey_hosting === 'Other'}>Other</option>
              <option value="None yet" selected={entry.survey_hosting === 'None yet'}>None yet</option>
            </select>
          </div>
          <button type="submit" class="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors cursor-pointer">
            Submit
          </button>
        </form>
        <p class="hidden mt-4 text-sm text-primary font-medium" id="survey-success">✓ Thanks! Your answers have been saved.</p>
      </div>

      <!-- Social Proof -->
      <p class="text-center text-sm text-text-secondary" id="social-proof">
        Loading waitlist stats…
      </p>

    </div>
  </main>
</BaseLayout>

<script define:vars={{ referralCode: entry.referral_code }}>
  // Copy button
  document.getElementById('copy-btn')?.addEventListener('click', () => {
    const input = document.getElementById('referral-link');
    navigator.clipboard.writeText(input.value);
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });

  // Survey form
  document.getElementById('survey-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const usecase = form.usecase.value;
    const hosting = form.hosting.value;

    if (!usecase && !hosting) return;

    const res = await fetch('/api/survey', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_code: referralCode, usecase, hosting }),
    });

    if (res.ok) {
      document.getElementById('survey-success')?.classList.remove('hidden');
      form.querySelector('button').disabled = true;
      form.querySelector('button').textContent = 'Saved';
    }
  });

  // Social proof
  fetch('/api/stats')
    .then((r) => r.json())
    .then((data) => {
      const el = document.getElementById('social-proof');
      if (el && data.total_signups) {
        const ago = data.last_signup_at ? new Date(data.last_signup_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        el.textContent = `${data.total_signups} people on the waitlist${ago ? ` · Last signup: ${ago}` : ''}`;
      }
    })
    .catch(() => {});
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WaitlistBadge.astro src/pages/welcome.astro
git commit -m "feat: add welcome page with referral sharing, badge, and survey"
```

---

## Task 16: Seed Data & Local Dev Setup

**Files:**
- Create: `db/seed.sql`

- [ ] **Step 1: Write seed data**

Write `db/seed.sql`:

```sql
-- Test data for local development
INSERT INTO waitlist (email, email_verified, referral_code, position, original_position, ip_address)
VALUES
  ('alice@example.com', TRUE, 'cdr_test0001', 1, 1, '127.0.0.1'),
  ('bob@example.com', TRUE, 'cdr_test0002', 2, 2, '127.0.0.1'),
  ('charlie@example.com', FALSE, 'cdr_test0003', 3, 3, '127.0.0.1');

-- Bob was referred by Alice
UPDATE waitlist SET referred_by = 'cdr_test0001' WHERE email = 'bob@example.com';
UPDATE waitlist SET referral_count = 1 WHERE email = 'alice@example.com';

INSERT INTO referral_events (referrer_code, referred_email, ip_address)
VALUES ('cdr_test0001', 'bob@example.com', '127.0.0.1');
```

- [ ] **Step 2: Commit**

```bash
git add db/seed.sql
git commit -m "feat: add seed data for local development"
```

---

## Task 17: Final Wiring & Build Verification

**Files:**
- Modify: `src/pages/index.astro` (if needed), `astro.config.mjs` (if needed)

- [ ] **Step 1: Create placeholder images directory**

```bash
mkdir -p public/images
```

Create placeholder SVG for missing images. Write `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#4F46E5"/>
  <text x="16" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="18" fill="white">C</text>
</svg>
```

- [ ] **Step 2: Create .env for local dev**

```bash
cp .env.example .env
```

Fill in local Postgres URL and Resend test key. (Not committed.)

- [ ] **Step 3: Run full build**

```bash
npx astro build
```

Expected: Build succeeds with prerendered `index.html` and SSR functions for `welcome`, `api/*`.

- [ ] **Step 4: Run dev server**

```bash
npx astro dev
```

Expected: Dev server starts. Landing page renders at `http://localhost:4321`. All sections visible. SignupForm loads counter (will fail without DB – expected).

- [ ] **Step 5: Commit**

```bash
git add public/favicon.svg
git commit -m "feat: add favicon and finalize project structure"
```

---

## Task 18: Cloudflare Pages Deployment Config

**Files:**
- Create: `wrangler.toml` (optional, for Hyperdrive config)

- [ ] **Step 1: Create wrangler config**

Write `wrangler.toml`:

```toml
name = "cadre-waitlist"
compatibility_date = "2026-04-01"
pages_build_output_dir = "./dist"

[vars]
SITE_URL = "https://cadre.run"

# Hyperdrive binding for Postgres (configure ID after creating in Cloudflare dashboard)
# [[hyperdrive]]
# binding = "HYPERDRIVE"
# id = "<your-hyperdrive-config-id>"
```

- [ ] **Step 2: Commit**

```bash
git add wrangler.toml
git commit -m "feat: add Cloudflare Pages deployment config"
```

---

## Summary

| Task | Description | Key Files |
|---|---|---|
| 1 | Project scaffolding | `astro.config.mjs`, `tailwind.config.mjs`, `global.css` |
| 2 | Database schema & client | `db/schema.sql`, `src/lib/db.ts` |
| 3 | Referral & utility library | `src/lib/referral.ts`, `src/lib/rate-limit.ts` |
| 4 | Resend email integration | `src/lib/resend.ts` |
| 5 | Signup API endpoint | `src/pages/api/signup.ts` |
| 6 | Verify API endpoint | `src/pages/api/verify.ts` |
| 7 | Stats, Survey, Position endpoints | `src/pages/api/stats.ts`, `survey.ts`, `position/[code].ts` |
| 8 | Badge generation | `src/pages/api/badge/[code].png.ts` |
| 9 | Base layout | `src/layouts/BaseLayout.astro` |
| 10 | SignupForm component | `src/components/SignupForm.astro` |
| 11 | Hero, PainSolution, HowItWorks | `src/components/Hero.astro`, etc. |
| 12 | Features, UseCases, Comparison | `src/components/Features.astro`, etc. |
| 13 | FAQ, FinalCTA, Footer | `src/components/FAQ.astro`, etc. |
| 14 | Landing page assembly | `src/pages/index.astro` |
| 15 | Welcome page & badge component | `src/pages/welcome.astro`, `WaitlistBadge.astro` |
| 16 | Seed data | `db/seed.sql` |
| 17 | Final wiring & build verification | `public/favicon.svg`, build test |
| 18 | Cloudflare deployment config | `wrangler.toml` |
