// Netlify Function — US State Department travel advisories.
// Fetches the full RSS feed server-side (no CORS limits, no item cap that
// public proxies like rss2json impose) and returns compact JSON.
// The source feed is ~1 MB and lists every country with a Level 1–4 rating.
exports.handler = async () => {
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const r = await fetch('https://travel.state.gov/_res/rss/TAsTWs.xml', {
      headers: { 'User-Agent': 'GeoIntelDashboard/1.0 (+netlify-function)' },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const xml = await r.text();

    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml))) {
      const block = m[1];
      const title = ((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
        .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').trim();
      const date  = ((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '').trim();
      const lm = title.match(/^(.*?)\s*-\s*Level\s*([1-4])\s*:\s*(.*)$/i);
      if (!lm) continue;
      items.push({ name: lm[1].trim(), level: +lm[2], label: lm[3].trim(), date });
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Cache-Control': 'public, max-age=3600' }, // 1h CDN cache
      body: JSON.stringify({ items, updated: new Date().toISOString() }),
    };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ items: [], error: String(e) }) };
  }
};
