import type { APIRoute } from 'astro';
import satori from 'satori';
import { getDb } from '../../../lib/runtime';

let fontCache: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const res = await fetch('https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf');
  if (!res.ok) {
    throw new Error(`Failed to fetch font: ${res.status}`);
  }
  fontCache = await res.arrayBuffer();
  return fontCache;
}

export const GET: APIRoute = async ({ params }) => {
  const sql = await getDb();
  const { code } = params;

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const [entry] = await sql`SELECT position FROM waitlist WHERE referral_code = ${code}`;

  if (!entry) {
    return new Response('Not found', { status: 404 });
  }

  const fontData = await getFont();

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
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
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
          style: 'normal' as const,
        },
      ],
    },
  );

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
