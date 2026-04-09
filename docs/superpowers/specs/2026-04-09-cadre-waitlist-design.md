# Cadre Waitlist Landing Page – Design Spec

**Domain:** cadre.run
**Date:** 2026-04-09
**Status:** Approved

---

## 1. Overview

Landing page and waitlist system for Cadre – a product that provisions fully isolated AI companies on user-owned servers. The waitlist captures early interest, builds a referral-driven queue, and collects user data for launch prioritization.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro (SSR mode) |
| Hosting | Cloudflare Pages |
| Styling | Tailwind CSS |
| Database | PostgreSQL on Hetzner (connection via ENV) |
| DB Proxy | Cloudflare Hyperdrive (TCP proxy for Workers → Hetzner Postgres) |
| Email | Resend SDK |
| Badge Gen | Satori + @resvg/resvg-js |
| Analytics | Cloudflare Analytics (built-in) |
| Fonts | Inter (Google Fonts), JetBrains Mono (self-hosted or Google Fonts) |

### Dependencies

```
astro
@astrojs/cloudflare
@astrojs/tailwind
postgres          # postgres.js – lightweight, edge-compatible
resend
satori
@resvg/resvg-js
```

## 3. Design Tokens

| Token | Hex | Usage |
|---|---|---|
| Primary (Indigo) | #4F46E5 | CTA Buttons, Logo, Accents |
| Primary Hover | #4338CA | Button Hover State |
| Text Primary | #0F172A | Headlines, Body Text |
| Text Secondary | #475569 | Sublines, Descriptions |
| Background | #FFFFFF | Page Background |
| Surface | #F8FAFC | Alternating Section Backgrounds |
| Accent Warm | #F59E0B | Status Dots, Highlights, Badges |
| Accent Peach | #FDE8D8 | Soft Gradient Accents in Visuals |
| Border | #E2E8F0 | Card Borders, Dividers |

**Typography:**
- Headlines: Inter, Semi-Bold (600), -1.5px letter-spacing
- Body: Inter, Regular (400), 16px/1.6
- Mono: JetBrains Mono, 14px

## 4. Project Structure

```
cadre-waitlist/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── welcome.astro
│   │   └── api/
│   │       ├── signup.ts
│   │       ├── verify.ts
│   │       ├── stats.ts
│   │       ├── survey.ts
│   │       ├── position/
│   │       │   └── [code].ts
│   │       └── badge/
│   │           └── [code].png.ts
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── PainSolution.astro
│   │   ├── HowItWorks.astro
│   │   ├── Features.astro
│   │   ├── UseCases.astro
│   │   ├── Comparison.astro
│   │   ├── FAQ.astro
│   │   ├── FinalCTA.astro
│   │   ├── Footer.astro
│   │   ├── SignupForm.astro
│   │   └── WaitlistBadge.astro
│   ├── lib/
│   │   ├── db.ts
│   │   ├── resend.ts
│   │   └── referral.ts
│   └── styles/
│       └── global.css
├── public/
│   ├── images/
│   └── fonts/
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
├── .env.example
└── tsconfig.json
```

## 5. Database Schema

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

## 6. Core Flows

### 6.1 Signup Flow

1. User submits email via SignupForm (+ optional `?ref=cdr_xxx` from URL)
2. `POST /api/signup` validates:
   - Email format (regex)
   - Not already registered
   - Not a disposable email domain
   - Rate limit: max 3 signups per IP per hour
   - Self-referral check: ref code !== own code
3. INSERT into waitlist: `position = original_position = MAX(position) + 1`
4. Generate `referral_code`: `cdr_` + 8 random alphanumeric chars
5. Generate `verification_token`: 32 random chars
6. Send verification email via Resend
7. Log in email_log
8. Return 201 with `{ referral_code, position }`
9. Client redirects to `/welcome?code=cdr_xxx`

### 6.2 Verification Flow

1. User clicks link in email → `GET /api/verify?token=xxx`
2. Find entry by verification_token
3. Set `email_verified = TRUE`, `verification_token = NULL`
4. If `referred_by` is set AND referrer is verified:
   a. Create `referral_events` entry
   b. Increment referrer's `referral_count`
   c. Trigger position recalculation for referrer
5. Send welcome email via Resend (position, referral link)
6. Log in email_log
7. Redirect to `/welcome?code=cdr_xxx&verified=true`

### 6.3 Position Recalculation (Atomic)

When a referrer earns a referral credit:

```
BEGIN TRANSACTION;
  -- Calculate new position
  new_position = MAX(1, referrer.position - 1)

  -- Shift everyone between new and old position down by 1
  UPDATE waitlist
  SET position = position + 1, updated_at = NOW()
  WHERE position >= new_position
    AND position < referrer.position
    AND id != referrer.id;

  -- Move referrer up
  UPDATE waitlist
  SET position = new_position, updated_at = NOW()
  WHERE id = referrer.id;
COMMIT;
```

### 6.4 Survey Flow

1. User fills dropdowns on Welcome page
2. `PATCH /api/survey` with `{ referral_code, usecase, hosting }`
3. Update waitlist entry
4. Return 200

## 7. API Endpoints

### `POST /api/signup`

- **Request:** `{ email: string, ref?: string }` + IP/UA from headers
- **Response:** `201 { success: true, referral_code: string, position: number }`
- **Errors:** `400` invalid email, `409` already registered, `429` rate limited

### `GET /api/verify?token=xxx`

- **Response:** `302` redirect to `/welcome?code=xxx&verified=true`
- **Errors:** `400` invalid/expired token

### `GET /api/stats`

- **Response:** `{ total_signups: number, last_signup_at: string }`
- Only counts verified signups for the public counter

### `PATCH /api/survey`

- **Request:** `{ referral_code: string, usecase?: string, hosting?: string }`
- **Response:** `200 { success: true }`

### `GET /api/position/[code]`

- **Response:** `{ position: number, original_position: number, referral_count: number, verified: boolean }`

### `GET /api/badge/[code].png`

- **Response:** `image/png` (1200x1200)
- Dark background (#0F172A), large position number, Cadre logo, "I'm on the Cadre waitlist", cadre.run
- Cache: `public, max-age=3600`

## 8. Landing Page Sections

### 8.1 Hero (Above the Fold)

- **Layout:** Two columns desktop (text+CTA left, image right). Single column mobile (text → image → CTA).
- **H1:** "Your AI team, deployed in minutes."
- **Subline:** "Cadre provisions a fully isolated AI company on your own server. Pre-optimized prompts, Gemini CLI ready, hardened infrastructure. You log in and start working."
- **CTA:** SignupForm component (email input + "Get Early Access" button)
- **Counter:** "Join [X] others on the waitlist · No spam, ever." (fetched from `/api/stats`)
- **Trust badges:** "GDPR Compliant · Your Server, Your Data · Setup < 5 min"
- **Image:** Org-Chart Glassmorphism nodes (provided asset)

### 8.2 Pain → Solution (3 Cards)

Three cards, each with: crossed-out pain statement → bold solution → metric.

1. **Setup Pain:** "Docker + VPS + .env = hours of debugging" → "Fill out a form. Your server is provisioned, hardened, ready." → "Setup time: under 5 minutes"
2. **Token Costs:** "AI agents burn through tokens like there's no tomorrow" → "Pre-optimized prompting system. Same output, fraction of the cost." → "Up to 60% fewer tokens per task"
3. **No Visibility:** "No visibility into what your agents actually do and cost" → "Dashboard with heartbeats, budgets, department controls, live status." → "Real-time cost tracking per agent"

### 8.3 How It Works (3 Steps)

Horizontal steps connected by line/arrows. Numbered 01, 02, 03.

1. **Choose your infrastructure** – "Pick your hosting provider – Hetzner, Netcup, or DigitalOcean. Select your VPS size. Done." → Provider logos visual
2. **Configure your AI company** – "Define departments, assign roles, set budgets. Our intake form handles your entire .env and first setup." → Glass Cards Workflow image (provided asset)
3. **Log in and go** – "Your server is provisioned, secured, and running. Log in to your Cadre dashboard and start delegating to your AI team." → Dashboard Isometric image (provided asset)

### 8.4 What You Get (Features)

Two columns: "Included in v1" (checkmarks) | "On the Roadmap" (grayed out with tags).

**v1:**
- Automated server provisioning (Hetzner, Netcup, DigitalOcean)
- Server hardening (SSH, Firewall, Fail2ban, auto-updates)
- Containerized Paperclip (Docker Compose, production-ready)
- Pre-optimized prompting system
- Gemini CLI integration (subscription-based)
- Department-based RBAC
- Agent heartbeat monitoring & cost tracking

**Roadmap:**
- Vision Board
- Agentic DMS Module
- Integration Hub / Module Marketplace
- HR Module
- Automated backups & monitoring dashboard
- Multi-provider agent support expansion

### 8.5 Who It's For (4 Use Cases)

Four cards with persona, description, before → after.

1. **Solopreneur / Indie Hacker** – AI Content Team without DevOps knowledge
2. **Agency / Small Team** – Delegate repetitive client work to AI agents
3. **SMB / Mittelstand** – AI automations for back-office without building AI infrastructure
4. **Developer / Builder** – Knows Paperclip, wants managed infrastructure

### 8.6 Built Different (Comparison Table)

Side-by-side: Self-Host vs Cadre. Rows: Setup Time, Docker Knowledge, Token Optimization, Gemini CLI, Server Hardening, RBAC, Monitoring, Modules, GDPR. Checkmarks (indigo) vs X-marks (gray).

### 8.7 FAQ (5 Questions, Accordion)

1. Do I need my own API keys?
2. Where does my data live?
3. Is this based on Paperclip?
4. What does it cost?
5. Can I migrate from my existing Paperclip setup?

### 8.8 Final CTA

Full-width section with indigo gradient background. Centered text + SignupForm.
- **Headline:** "Your AI team is waiting."
- **Subline:** "Join the waitlist. Be first when Cadre launches."
- **Note:** "No spam. Unsubscribe anytime. We'll only email you about launch updates."

### 8.9 Footer

- Cadre logo (small)
- Links: Privacy Policy · Terms · X
- "Built in Germany · Powered by Paperclip (MIT)"
- © 2026 Cadre

## 9. Welcome Page (`/welcome`)

**Route:** `/welcome?code=cdr_xxx` (SSR, loads data server-side)

### Layout

1. **Header:** Position display – "You're in. #[POSITION] on the waitlist."
2. **Verification notice** (if not verified): "Check your inbox to confirm your email."
3. **Verified state:** Subtle checkmark animation
4. **Referral section:**
   - Personal link: `cadre.run?ref=cdr_xxx` with copy button
   - Share buttons: X (pre-filled tweet), LinkedIn, Email
   - Stats: "You've referred [X] people"
   - Badge preview with download button + "Share on X" link
5. **Survey section:**
   - Headline: "Help us build the right thing"
   - Dropdown 1: Primary use case (Content Agency / Lead Research / Back-Office Automation / DMS / Code Review / Other)
   - Dropdown 2: Hosting provider (Hetzner / Netcup / DigitalOcean / AWS / Other / None yet)
   - Submit button → checkmark on success
6. **Social proof:** "[TOTAL] people on the waitlist · Last signup: [TIMESTAMP]"

### OG Tags

Dynamic OG image: `/api/badge/[code].png` – when someone shares their referral link, the social preview shows their waitlist position.

## 10. Email Templates

### Verification Email (sent on signup)

```
From: Cadre <hello@cadre.run>
Subject: Confirm your spot on the Cadre waitlist

Hey,

Confirm your email to secure your spot:

[Confirm my email] → cadre.run/api/verify?token=xxx

You're currently #[POSITION] on the waitlist.

– The Cadre Team
```

### Welcome Email (sent after verification)

```
From: Cadre <hello@cadre.run>
Subject: You're #[POSITION] on the Cadre waitlist

You're confirmed. Here's your spot: #[POSITION]

Want to move up? Share your personal link:
cadre.run?ref=[CODE]

Every signup through your link moves you one spot up.

– The Cadre Team
```

### Future Emails (not built in v1)

- **Day 3-4:** "Here's what we're building" – Loom/GIF, behind-the-scenes
- **Day 7-10:** Roadmap update, community invite, referral reminder

## 11. Anti-Abuse Measures

- **Double Opt-In:** Only verified emails count as referrals
- **Rate Limiting:** Max 3 signups per IP per hour
- **Self-Referral Block:** `referred_by` cannot be own referral code
- **Disposable Email Check:** Block known disposable email domains
- **Unique Referral Events:** `UNIQUE(referrer_code, referred_email)` – no double crediting
- **IP + User-Agent Logging:** Stored for fraud investigation

## 12. Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:5432/cadre_waitlist
RESEND_API_KEY=re_xxxxx
SITE_URL=https://cadre.run
```

## 13. Performance Targets

- Lighthouse Score: >95
- LCP: <1.5s
- Static pages pre-rendered, dynamic endpoints on Cloudflare Workers edge
- Badge images cached with `public, max-age=3600`

## 14. Out of Scope (v1)

- Email sequences 2+3 (Day 3-4, Day 7-10)
- Resend webhook integration (delivery/bounce tracking)
- Custom analytics (Plausible/Umami)
- Tier-based referral rewards (Founding Member status)
- A/B testing on headlines
- Admin dashboard for waitlist management
