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
