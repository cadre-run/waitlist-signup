import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/runtime';

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

  const pos = entry.position;
  const posText = `#${pos}`;

  // Cadre logo paths (from logo-wordmark.svg)
  const logoPaths = `
    <path fill="white" d="M401.655151,715.272339 C394.843475,702.922791 387.228912,691.424500 381.341980,679.012268 C383.671143,677.037964 385.923187,677.756714 387.976074,677.755249 C454.106384,677.709595 520.236816,677.660461 586.366821,677.817505 C591.185303,677.828918 593.782532,676.257812 596.143494,672.111877 C614.684265,639.553711 633.459412,607.129028 652.193115,574.680847 C653.425537,572.546143 654.351196,570.167236 656.362366,568.546448 C658.522705,568.697571 658.866333,570.570251 659.645508,571.929626 C675.296143,599.234497 690.846497,626.597412 706.633118,653.823364 C709.009705,657.922058 709.056091,661.059387 706.634338,665.203064 C687.729065,697.550232 668.955811,729.976196 650.426697,762.539978 C647.521667,767.645386 644.337097,769.586853 638.318237,769.566772 C571.022888,769.341492 503.726349,769.423157 436.430389,769.549011 C433.341827,769.554810 432.013672,768.183594 430.682892,765.850525 C421.112335,749.071533 411.460022,732.339111 401.655151,715.272339z"/>
    <path fill="white" d="M679.964233,315.099731 C689.090759,330.836151 697.965637,346.295349 707.027161,361.644379 C709.017090,365.015167 709.155945,367.741699 707.128052,371.254364 C690.970459,399.242401 675.006165,427.342072 658.968079,455.399139 C658.490051,456.235443 658.135254,457.272675 656.814941,457.407806 C655.108093,457.156128 654.733948,455.527466 654.018127,454.289490 C634.255188,420.108673 614.455017,385.949005 594.852173,351.676483 C592.924316,348.305908 590.398682,348.287140 587.347473,348.287933 C522.187317,348.304657 457.027191,348.306335 391.867065,348.262451 C389.463226,348.260834 386.898987,348.929504 384.672455,347.430969 C384.112305,345.446198 385.346130,344.110687 386.135925,342.728790 C401.512390,315.825531 417.002197,288.986664 432.259857,262.016388 C434.497559,258.060913 437.007996,256.469269 441.661865,256.481293 C502.988647,256.639709 564.315918,256.593903 625.643127,256.584412 C630.973145,256.583588 636.314026,256.663849 641.629150,256.352509 C644.920227,256.159760 646.790588,257.353241 648.399902,260.184021 C658.774292,278.432281 669.302124,296.593262 679.964233,315.099731z"/>
    <path fill="white" d="M308.817108,530.119141 C306.314026,525.755859 304.177856,521.585144 301.581421,517.723938 C299.331604,514.378296 299.452972,511.667603 301.502014,508.139282 C326.096497,465.789368 350.536652,423.349731 374.975555,380.909607 C376.490845,378.278198 378.138000,376.617371 381.558990,376.628113 C414.218414,376.730560 446.878326,376.671875 479.538116,376.691254 C480.802948,376.692017 482.223572,376.303467 483.303864,377.498779 C483.807098,379.385071 482.402527,380.601746 481.609192,381.984314 C457.318970,424.315063 433.036530,466.650452 408.618896,508.907684 C406.853699,511.962494 407.062927,514.187744 408.746948,517.107727 C432.964020,559.098755 457.083527,601.146179 481.189972,643.200928 C482.141296,644.860657 483.712250,646.406616 483.051697,648.652405 C481.511871,649.727600 479.794128,649.303894 478.172180,649.305664 C446.512177,649.339172 414.851807,649.277832 383.192474,649.429993 C379.223328,649.449036 376.901184,648.268921 374.876770,644.736267 C353.012207,606.582397 330.974518,568.527771 308.817108,530.119141z"/>`;

  const svg = `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F1A"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
    <radialGradient id="orb1" cx="30%" cy="20%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="80%" cy="80%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#grid)"/>

  <!-- Ambient orbs -->
  <circle cx="300" cy="200" r="400" fill="url(#orb1)"/>
  <circle cx="900" cy="900" r="350" fill="url(#orb2)"/>

  <!-- Glow line accent -->
  <rect x="100" y="1050" width="1000" height="2" rx="1" fill="url(#glow)" opacity="0.3"/>

  <!-- Cadre logomark -->
  <g transform="translate(525, 140) scale(0.145)" opacity="0.9">
    ${logoPaths}
  </g>

  <!-- Position number with glow -->
  <text x="600" y="600" text-anchor="middle" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="800" font-size="320" fill="white" letter-spacing="-12">${posText}</text>

  <!-- Subtle glow behind number -->
  <text x="600" y="600" text-anchor="middle" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="800" font-size="320" fill="#4F46E5" opacity="0.15" filter="blur(30px)" letter-spacing="-12">${posText}</text>

  <!-- Tagline -->
  <text x="600" y="720" text-anchor="middle" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="500" font-size="42" fill="#94A3B8">My AI team is getting deployed.</text>

  <!-- Subline -->
  <text x="600" y="790" text-anchor="middle" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="400" font-size="30" fill="#475569">Are you on the list?</text>

  <!-- Bottom bar -->
  <rect x="100" y="1080" width="1000" height="80" rx="16" fill="white" opacity="0.05"/>

  <!-- cadre wordmark bottom -->
  <g transform="translate(140, 1095) scale(0.05)" opacity="0.6">
    ${logoPaths}
  </g>
  <text x="200" y="1130" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="600" font-size="28" fill="white" opacity="0.5" letter-spacing="-0.5">cadre</text>

  <!-- URL bottom right -->
  <text x="1060" y="1130" text-anchor="end" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="400" font-size="24" fill="#64748B">cadre.run</text>

  <!-- Decorative corner dots -->
  <circle cx="140" cy="140" r="4" fill="#4F46E5" opacity="0.4"/>
  <circle cx="1060" cy="140" r="4" fill="#7C3AED" opacity="0.4"/>
  <circle cx="140" cy="1060" r="4" fill="#4F46E5" opacity="0.3"/>
  <circle cx="1060" cy="1060" r="4" fill="#7C3AED" opacity="0.3"/>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
