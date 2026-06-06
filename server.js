const express = require('express');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const rssParser = new Parser({ timeout: 8000 });
const PORT = process.env.PORT || 3000;

let newsCache = { data: [], lastFetch: 0 };
let gdeltCache = { data: [], lastFetch: 0 };
const NEWS_TTL = 5 * 60 * 1000;
const GDELT_TTL = 10 * 60 * 1000;

// Curated internationally-recognized journalism. Tiers: 1 wire · 2 major intl · 3 quality regional.
const RSS_FEEDS = [
  { source: 'Reuters', tier: 1, url: 'https://news.google.com/rss/search?q=when:1d%20site:reuters.com&hl=en-US&gl=US&ceid=US:en', strip: true },
  { source: 'AP',      tier: 1, url: 'https://news.google.com/rss/search?q=when:1d%20site:apnews.com&hl=en-US&gl=US&ceid=US:en', strip: true },
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

app.use(express.static(path.join(__dirname, 'public')));

// US State Dept travel advisories — mirrors the Netlify function for local dev.
let advisoryCache = { data: [], lastFetch: 0 };
const ADVISORY_TTL = 60 * 60 * 1000; // 1h
app.get('/api/advisories', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  if (Date.now() - advisoryCache.lastFetch < ADVISORY_TTL && advisoryCache.data.length) {
    return res.json({ items: advisoryCache.data, cached: true });
  }
  try {
    const r = await fetch('https://travel.state.gov/_res/rss/TAsTWs.xml', {
      headers: { 'User-Agent': 'GeoIntelDashboard/1.0' },
    });
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
    if (items.length) advisoryCache = { data: items, lastFetch: Date.now() };
    res.json({ items: items.length ? items : advisoryCache.data, updated: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ items: advisoryCache.data, error: String(e) });
  }
});

app.get('/api/news', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  if (Date.now() - newsCache.lastFetch < NEWS_TTL && newsCache.data.length > 0) {
    return res.json({ items: newsCache.data, cached: true });
  }

  const allItems = [];
  const fetchPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const feedData = await Promise.race([
        rssParser.parseURL(feed.url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000)),
      ]);
      const items = (feedData.items || []).slice(0, 6).map(item => {
        let title = item.title ? item.title.replace(/\s+/g, ' ').trim() : '';
        if (feed.strip) title = title.replace(/\s+-\s+[^-–]{2,28}$/, '').trim();
        return {
          title,
          source: feed.source,
          tier: feed.tier || 3,
          date: item.pubDate || item.isoDate || new Date().toISOString(),
          link: item.link || '',
        };
      }).filter(i => i.title.length > 10);
      return items;
    } catch (err) {
      console.warn(`[RSS] ${feed.source}: ${err.message}`);
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  results.forEach(r => { if (r.status === 'fulfilled') allItems.push(...r.value); });
  const seen = new Set();
  const deduped = allItems.filter(i => { const k = i.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (deduped.length > 0) newsCache = { data: deduped, lastFetch: Date.now() };
  const out = deduped.length > 0 ? deduped : newsCache.data;
  res.json({ items: out, sourcesLive: new Set(out.map(i => i.source)).size, source: 'live' });
});

app.get('/api/events', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  if (Date.now() - gdeltCache.lastFetch < GDELT_TTL && gdeltCache.data.length > 0) {
    return res.json({ articles: gdeltCache.data, cached: true });
  }

  const queries = [
    'war conflict military attack',
    'protest unrest violence crisis',
    'sanctions coup insurgency',
  ];

  const allArticles = [];
  for (const query of queries) {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=20&sort=DateDesc&sourcelang=english`;
      const response = await Promise.race([
        fetch(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      const data = await response.json();
      if (data.articles) {
        allArticles.push(...data.articles.map(a => ({
          title: a.title,
          domain: a.domain,
          url: a.url,
          date: a.seendate,
          country: a.sourcecountry || '',
        })));
      }
    } catch (err) {
      console.warn(`[GDELT] query failed: ${err.message}`);
    }
  }

  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (!a.title || seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (unique.length > 0) gdeltCache = { data: unique.slice(0, 50), lastFetch: Date.now() };
  res.json({ articles: gdeltCache.data, source: 'gdelt' });
});

app.get('/api/status', (req, res) => {
  res.json({
    newsLastFetch: newsCache.lastFetch,
    gdeltLastFetch: gdeltCache.lastFetch,
    newsItems: newsCache.data.length,
    gdeltItems: gdeltCache.data.length,
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`\n  ◈ GEOPOLITICAL INTEL DASHBOARD`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Running at http://localhost:${PORT}`);
  console.log(`  Press Ctrl+C to stop\n`);
});
