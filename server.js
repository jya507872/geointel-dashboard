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

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://www.theguardian.com/world/rss', source: 'Guardian' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters' },
  { url: 'https://foreignpolicy.com/feed/', source: 'Foreign Policy' },
];

app.use(express.static(path.join(__dirname, 'public')));

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
      const items = (feedData.items || []).slice(0, 8).map(item => ({
        title: item.title ? item.title.replace(/\s+/g, ' ').trim() : '',
        source: feed.source,
        date: item.pubDate || item.isoDate || new Date().toISOString(),
        link: item.link || '',
      })).filter(i => i.title.length > 10);
      return items;
    } catch (err) {
      console.warn(`[RSS] ${feed.source}: ${err.message}`);
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  results.forEach(r => { if (r.status === 'fulfilled') allItems.push(...r.value); });
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allItems.length > 0) newsCache = { data: allItems, lastFetch: Date.now() };
  res.json({ items: allItems.length > 0 ? allItems : newsCache.data, source: 'live' });
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
