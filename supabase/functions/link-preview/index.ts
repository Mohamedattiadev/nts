// Nts link preview: title, description, image, site and favicon for a URL, so links never go to a third party (microlink).
// Only signed-in Nts users can call it (Supabase checks the JWT). Deploy:
//   supabase functions deploy link-preview --project-ref tsnlhzuhbteqgjvxobbx
// Request: POST { url } (or { urls: [...] } up to 10)  →  { [url]: { title, description, image, logo, site } | null }

const PRIVATE = /^(localhost|.*\.local|.*\.internal|0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:|\[?fe80:)/i;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
const OEMBED: [RegExp, (u: string) => string][] = [
  [/(^|\.)reddit\.com$/, u => `https://www.reddit.com/oembed?url=${encodeURIComponent(u)}`],
  [/(^|\.)(youtube\.com|youtu\.be)$/, u => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`],
  [/(^|\.)vimeo\.com$/, u => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`],
];
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; NtsPreview/1.0)', 'accept-language': 'tr,en;q=0.8' };

export async function preview(raw: string) {
  let u: URL; try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return null;
  const oe = OEMBED.find(([re]) => re.test(u.hostname));
  if (oe) {
    try {
      const j = await (await fetch(oe[1](u.href), { headers: UA, signal: AbortSignal.timeout(6000) })).json();
      if (j.title) return { title: j.title, description: j.author_name ? `${j.author_name} · ${j.provider_name || u.hostname}` : undefined, image: j.thumbnail_url, site: j.provider_name };
    } catch { /* fall through to the page */ }
  }
  try {
    const res = await fetch(u, { redirect: 'follow', headers: UA, signal: AbortSignal.timeout(8000) });
    const final = new URL(res.url || u.href); if (PRIVATE.test(final.hostname)) return null;
    if (!(res.headers.get('content-type') || '').includes('html')) { await res.body?.cancel(); return { title: decodeURIComponent(final.pathname.split('/').pop() || final.hostname) }; }
    const reader = res.body!.getReader(); let html = '', size = 0; const td = new TextDecoder();
    while (size < 600_000) { const { done, value } = await reader.read(); if (done) break; size += value.length; html += td.decode(value, { stream: true }); if (html.includes('</head>')) break; }
    reader.cancel().catch(() => {});
    const m = (re: RegExp) => { const x = html.match(re); return x ? decode(x[1]) : undefined; };
    const og = (p: string) => m(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, 'i'))
      || m(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, 'i'));
    const abs = (x?: string) => { try { return x ? new URL(x, final).href : undefined; } catch { return undefined; } };
    const icon = m(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) || m(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
    return {
      title: og('og:title') || og('twitter:title') || m(/<title[^>]*>([^<]*)<\/title>/i) || final.hostname,
      description: og('og:description') || og('twitter:description') || og('description'),
      image: abs(og('og:image') || og('twitter:image')), logo: abs(icon) || `${final.origin}/favicon.ico`, site: og('og:site_name') || final.hostname.replace(/^www\./, ''),
    };
  } catch { return null; }
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS' };
export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('POST { url }', { status: 405, headers: CORS });
  const body = await req.json().catch(() => ({}));
  const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter((x: unknown) => typeof x === 'string').slice(0, 10);
  const out: Record<string, unknown> = {};
  await Promise.all(urls.map(async x => { out[x] = await preview(x); }));
  return new Response(JSON.stringify(out), { headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'private, max-age=3600' } });
}

if (import.meta.main) Deno.serve(handle);
