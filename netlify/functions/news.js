// Netlify Function — aggregated world-news feed.
// Fetches a curated set of internationally-recognized journalistic sources
// server-side (no CORS, no rss2json 10-item cap, no client rate-limiting),
// tier-tags each item, merges, de-duplicates and returns the latest.
//
// Tiers: 1 = wire services · 2 = major international journalism
//        3 = quality regional / specialty journalism
const FEEDS = [
  // ── TIER 1 — Wire services (via Google News site-filter; Reuters/AP
  //    discontinued their own public RSS) ──────────────────────────────
  { source: 'Reuters', tier: 1, url: 'https://news.google.com/rss/search?q=when:1d%20site:reuters.com&hl=en-US&gl=US&ceid=US:en', strip: true },
  { source: 'AP',      tier: 1, url: 'https://news.google.com/rss/search?q=when:1d%20site:apnews.com&hl=en-US&gl=US&ceid=US:en', strip: true },

  // ── TIER 2 — Major established international journalism ───────────────
  { source: 'BBC',             tier: 2, url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'Guardian',        tier: 2, url: 'https://www.theguardian.com/world/rss' },
  { source: 'NYT',             tier: 2, url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { source: 'Washington Post', tier: 2, url: 'https://feeds.washingtonpost.com/rss/world' },
  { source: 'Financial Times', tier: 2, url: 'https://www.ft.com/world?format=rss' },
  { source: 'The Economist',   tier: 2, url: 'https://www.economist.com/international/rss.xml' },
  { source: 'NPR',             tier: 2, url: 'https://feeds.npr.org/1004/rss.xml' },
  { source: 'CNN',             tier: 2, url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { source: 'CBC',             tier: 2, url: 'https://www.cbc.ca/webfeed/rss/rss-world' },
  { source: 'Sky News',        tier: 2, url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { source: 'ABC Australia',   tier: 2, url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { source: 'El País',         tier: 2, url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada' },

  // ── TIER 3 — Quality regional & specialty journalism ────────────────
  { source: 'Al Jazeera',      tier: 3, url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'Deutsche Welle',  tier: 3, url: 'https://rss.dw.com/rdf/rss-en-world' },
  { source: 'France 24',       tier: 3, url: 'https://www.france24.com/en/rss' },
  { source: 'RFE/RL',          tier: 3, url: 'https://www.rferl.org/api/epiqq' },
  { source: 'Foreign Policy',  tier: 3, url: 'https://foreignpolicy.com/feed/' },
  { source: 'Foreign Affairs', tier: 3, url: 'https://www.foreignaffairs.com/rss.xml' },
  { source: 'Bellingcat',      tier: 3, url: 'https://www.bellingcat.com/feed/' },
  { source: 'The Hindu',       tier: 3, url: 'https://www.thehindu.com/news/international/feeder/default.rss' },
  { source: 'SCMP',            tier: 3, url: 'https://www.scmp.com/rss/91/feed' },
  { source: 'Times of Israel', tier: 3, url: 'https://www.timesofisrael.com/feed/' },
  { source: 'Moscow Times',    tier: 3, url: 'https://www.themoscowtimes.com/rss/news' },
  { source: 'Channel NewsAsia',tier: 3, url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml' },
  { source: 'Times of India',  tier: 3, url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms' },
];

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#x27;/gi, "'")
          .replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchOne(feed) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeoIntelDashboard/1.0)' },
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!r.ok) return [];
    const xml = await r.text();
    const out = [];
    const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let m, n = 0;
    while ((m = itemRe.exec(xml)) && n < 6) {
      const b = m[1];
      let title = decode(tag(b, 'title'));
      let link = tag(b, 'link');
      if (!link) { const lm = b.match(/<link[^>]*href="([^"]+)"/i); if (lm) link = lm[1]; }
      const date = tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated') || '';
      if (feed.strip) title = title.replace(/\s+-\s+[^-–]{2,28}$/, '').trim(); // drop " - Reuters" suffix
      if (title.length > 12) { out.push({ title, source: feed.source, tier: feed.tier, date, link: link.trim() }); n++; }
    }
    return out;
  } catch { return []; }
}

exports.handler = async () => {
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchOne));
    let items = [];
    results.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value); });

    // De-duplicate by title, then sort newest-first
    const seen = new Set();
    items = items.filter(i => { const k = i.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    items = items.slice(0, 160);

    const sourcesLive = new Set(items.map(i => i.source)).size;
    return {
      statusCode: 200,
      headers: { ...CORS, 'Cache-Control': 'public, max-age=180' }, // 3-min CDN cache
      body: JSON.stringify({ items, sourcesLive, updated: new Date().toISOString() }),
    };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ items: [], error: String(e) }) };
  }
};
