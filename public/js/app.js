// ── GEOPOLITICAL INTELLIGENCE DASHBOARD — APP CONTROLLER ───────
const App = (() => {
  const NEWS_POLL_MS  = 5  * 60 * 1000;
  const GDELT_POLL_MS = 10 * 60 * 1000;
  const TICKER_SPEED  = 55; // px/s

  // When served from Netlify/any non-localhost host, call public APIs directly.
  // When running locally via `npm start`, use the Express proxy (cached, private).
  const IS_LOCAL = ['localhost','127.0.0.1',''].includes(window.location.hostname);

  // rss2json.com converts RSS → JSON with CORS support (free, no key needed)
  const RSS_TO_JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

  // Tiered feeds: tier 1 = wire services, 2 = major journalism, 3 = quality specialty
  // Social media screened separately via Reddit public API
  const PUBLIC_FEEDS = [
    // ── TIER 1: Wire Services ────────────────────────────────────
    { url: 'https://feeds.reuters.com/reuters/worldNews',                  source: 'Reuters',        tier: 1 },
    { url: 'https://rss.app/feeds/tBtCCLz9uQvGnomp.xml',                 source: 'AP',             tier: 1 },
    // ── TIER 2: Established International Journalism ─────────────
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                 source: 'BBC',            tier: 2 },
    { url: 'https://www.theguardian.com/world/rss',                        source: 'Guardian',       tier: 2 },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',      source: 'NYT',            tier: 2 },
    { url: 'https://feeds.washingtonpost.com/rss/world',                   source: 'Washington Post', tier: 2 },
    { url: 'https://www.ft.com/world?format=rss',                          source: 'Financial Times', tier: 2 },
    // ── TIER 3: Quality Regional & Specialty ─────────────────────
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',                   source: 'Al Jazeera',     tier: 3 },
    { url: 'https://feeds.dw.com/rss/rss__en_world',                      source: 'Deutsche Welle', tier: 3 },
    { url: 'https://www.france24.com/en/rss',                             source: 'France 24',      tier: 3 },
    { url: 'https://www.rferl.org/api/epiqq',                             source: 'RFE/RL',         tier: 3 },
    { url: 'https://foreignpolicy.com/feed/',                              source: 'Foreign Policy', tier: 3 },
    { url: 'https://foreignaffairs.com/rss.xml',                          source: 'Foreign Affairs', tier: 3 },
    { url: 'https://feeds.bellingcat.com/bellingcat',                     source: 'Bellingcat',     tier: 3 },
  ];

  // Reddit public API — social media screening tier (UNVERIFIED, needs cross-check)
  const REDDIT_FEEDS = [
    { sub: 'worldnews',   label: 'r/worldnews' },
    { sub: 'geopolitics', label: 'r/geopolitics' },
    { sub: 'UkraineWarVideoReport', label: 'r/UkrWar' },
  ];

  // ── LIVE TV CHANNEL ROSTER ────────────────────────────────────
  // ytId: YouTube video ID for the channel's official permanent live stream
  // embed: false = no YouTube embed available, directUrl = fallback site
  // trust: 'T2'=verified journalism, 'T3'=quality/regional, 'STATE'=state-controlled
  const TV_CHANNELS = [
    // ── Tier 2 ──────────────────────────────────────────────────
    { id:'sky',       name:'Sky News',       flag:'🇬🇧', ytId:'9Auq9mYxFEE',  trust:'T2', note:'UK · News Corp'            },
    { id:'bloomberg', name:'Bloomberg TV',   flag:'🇺🇸', ytId:'dp8PhLsUcFE',  trust:'T2', note:'US · Business/Finance'     },
    // ── Tier 3 ──────────────────────────────────────────────────
    { id:'aljazeera', name:'Al Jazeera',     flag:'🇶🇦', ytId:'JS3inMqRFkM',  trust:'T3', note:'Qatar-funded, editorial independence' },
    { id:'france24',  name:'France 24',      flag:'🇫🇷', ytId:'nSLCuBMR43Y',  trust:'T3', note:'France · Public broadcaster' },
    { id:'dw',        name:'DW News',        flag:'🇩🇪', ytId:'bKieHIlBNiU',  trust:'T3', note:'Germany · Public broadcaster' },
    { id:'euronews',  name:'Euronews',       flag:'🇪🇺', ytId:'OJDpLokfd7A',  trust:'T3', note:'Pan-European'               },
    { id:'wion',      name:'WION',           flag:'🇮🇳', ytId:'ZHjg1gFfmEU',  trust:'T3', note:'India · Zee Media'          },
    { id:'nhk',       name:'NHK World',      flag:'🇯🇵', ytId:'nCl3mAX0Q_U',  trust:'T3', note:'Japan · Public broadcaster' },
    { id:'arirang',   name:'Arirang News',   flag:'🇰🇷', ytId:'b_hlHkSPIG4',  trust:'T3', note:'South Korea · Public'       },
    { id:'trt',       name:'TRT World',      flag:'🇹🇷', ytId:'oeTRPp2bfpM',  trust:'T3', note:'Turkey · Public broadcaster' },
    // ── Embeds not available — direct link fallback ──────────────
    { id:'cnn',       name:'CNN',            flag:'🇺🇸', ytId:null, directUrl:'https://www.cnn.com/live-tv',      trust:'T2', note:'US · Requires CNN account'   },
    { id:'bbc',       name:'BBC World',      flag:'🇬🇧', ytId:null, directUrl:'https://www.bbc.co.uk/news/live-news', trust:'T2', note:'UK · Open, no sign-in required' },
    // ── State / government-controlled (labeled prominently) ──────
    { id:'cgtn',      name:'CGTN',           flag:'🇨🇳', ytId:'mMBfhKVBRB0',  trust:'STATE', note:'⚠ Chinese state media — apply critical reading' },
    { id:'presstv',   name:'Press TV',       flag:'🇮🇷', ytId:null, directUrl:'https://www.presstv.ir/live.html', trust:'STATE', note:'⚠ Iranian state media — severely biased, view critically' },
  ];

  let activeTvChannel = null;
  let tvFloatOpen     = false;

  let tickerAnim    = null;
  let tickerOffset  = 0;
  let lastTickerTs  = null;
  let currentCountry = null;
  let compareA = null, compareB = null;

  // ── HISTORICAL GPI RISK DATA (approx. per year, selected countries) ──
  // Format: { iso: [risk2008, risk2009, ..., risk2024] } — 17 values
  // We interpolate for countries not in list; values shift gradually
  const GPI_HISTORY = buildGpiHistory();

  // ── REGION VIEWS ─────────────────────────────────────────────
  const REGIONS = {
    'world':      { scale: 1,    cx: 0,    cy: 0    },
    'europe':     { scale: 4.5,  cx: 15,   cy: 54   },
    'middle-east':{ scale: 5,    cx: 42,   cy: 28   },
    'africa':     { scale: 3.2,  cx: 20,   cy: 2    },
    'asia':       { scale: 3,    cx: 100,  cy: 30   },
    'americas':   { scale: 2.8,  cx: -70,  cy: 10   },
  };

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    startClock();
    renderEventCards();
    renderActiveCount();
    initSearch();
    initRegionBar();
    initTimeline();
    initTravel();
    initCompare();
    initLiveTV();

    document.querySelectorAll('.ptab').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    );

    GeoMap.init(onCountrySelected);

    document.getElementById('map-svg').addEventListener('click', () => {
      GeoMap.deselectCountry();
    });

    document.getElementById('cp-compare-btn').addEventListener('click', () => {
      if (currentCountry) {
        switchTab('compare');
        setCompareSlot('a', currentCountry);
      }
    });

    fetchNews();
    fetchGdelt();
    setInterval(fetchNews,  NEWS_POLL_MS);
    setInterval(fetchGdelt, GDELT_POLL_MS);
    setSignal('SIGNAL LIVE', false);

    // Mobile panel toggle
    const mobileToggle = document.getElementById('mobile-panel-toggle');
    const intelPanel   = document.getElementById('intel-panel');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        const open = intelPanel.classList.toggle('mobile-open');
        mobileToggle.textContent = open ? '✕' : '◈ INTEL';
        document.getElementById('map-wrapper').classList.toggle('panel-open', open);
      });
    }

  }

  // ── CLOCK ─────────────────────────────────────────────────────
  function startClock() {
    const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    function tick() {
      const n = new Date();
      document.getElementById('clock').textContent =
        `${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())} UTC`;
      document.getElementById('date-display').textContent =
        `${DAYS[n.getUTCDay()]} ${pad(n.getUTCDate())} ${MONTHS[n.getUTCMonth()]} ${n.getUTCFullYear()}`;
    }
    tick(); setInterval(tick, 1000);
  }
  function pad(n) { return String(n).padStart(2,'0'); }

  // ── SIGNAL ────────────────────────────────────────────────────
  function setSignal(text, offline) {
    document.getElementById('signal-text').textContent = text;
    document.getElementById('signal-dot').classList.toggle('offline', offline);
  }

  // ── TABS ──────────────────────────────────────────────────────
  function switchTab(tab) {
    document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
  }

  // ── STATS ─────────────────────────────────────────────────────
  function renderActiveCount() {
    document.getElementById('stat-conflicts').textContent = MAJOR_EVENTS.filter(e => e.type === 'war').length;
    document.getElementById('stat-crises').textContent    = MAJOR_EVENTS.length;
    document.getElementById('stat-countries').textContent = Object.keys(COUNTRY_DATA).length;
  }

  // ── SEARCH ────────────────────────────────────────────────────
  function initSearch() {
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const clearBtn = document.getElementById('search-clear');
    const allCountries = Object.entries(COUNTRY_DATA).map(([id, d]) => ({ id, ...d }));

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      clearBtn.classList.toggle('hidden', !q);
      if (!q) { results.classList.add('hidden'); return; }

      const matches = allCountries.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.region || '').toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      ).sort((a,b) => b.risk - a.risk).slice(0, 8);

      if (!matches.length) { results.classList.add('hidden'); return; }

      results.innerHTML = matches.map(c => `
        <div class="search-result-item" data-id="${c.id}">
          <span class="sri-flag">${getFlag(c.alpha2)}</span>
          <div class="sri-info">
            <div class="sri-name">${escHtml(c.name)}</div>
            <div class="sri-region">${escHtml(c.region || '')} · ${getRiskLabel(c.risk)}</div>
          </div>
          <span class="sri-risk">
            <span class="sri-risk-dot" style="background:${getRiskColor(c.risk)}"></span>
          </span>
        </div>`).join('');

      results.classList.remove('hidden');
      results.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const data = COUNTRY_DATA[el.dataset.id];
          input.value = data.name;
          results.classList.add('hidden');
          clearBtn.classList.remove('hidden');
          GeoMap.zoomToCountryId(el.dataset.id);
          onCountrySelected(data, el.dataset.id);
        });
      });
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      results.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-bar')) results.classList.add('hidden');
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.blur(); results.classList.add('hidden'); }
    });
  }

  // ── REGION BAR ────────────────────────────────────────────────
  function initRegionBar() {
    document.querySelectorAll('.region-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.region-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        GeoMap.flyToRegion(REGIONS[btn.dataset.region]);
        if (btn.dataset.region === 'world') {
          setTimeout(() => btn.classList.remove('active'), 600);
        }
      });
    });
  }

  // ── TIMELINE SLIDER ───────────────────────────────────────────
  function initTimeline() {
    const slider = document.getElementById('timeline-slider');
    const yearEl = document.getElementById('timeline-year');
    const noteEl = document.getElementById('timeline-note');

    slider.addEventListener('input', () => {
      const yr = parseInt(slider.value);
      yearEl.textContent = yr;
      yearEl.className = 'mono ' + (yr === 2024 ? 'timeline-live' : 'timeline-historical');
      noteEl.textContent = yr === 2024 ? 'Current threat assessment' : `Historical GPI data — ${yr}`;
      GeoMap.applyHistoricalRisk(yr, GPI_HISTORY);
    });
  }

  // ── TRAVEL CHECKER ────────────────────────────────────────────
  function initTravel() {
    const input    = document.getElementById('travel-input');
    const btn      = document.getElementById('travel-check-btn');
    const sugg     = document.getElementById('travel-suggestions');
    const allC     = Object.entries(COUNTRY_DATA).map(([id,d]) => ({id,...d}));

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { sugg.classList.add('hidden'); return; }
      const m = allC.filter(c => c.name.toLowerCase().startsWith(q)).slice(0,5);
      sugg.innerHTML = m.map(c => `
        <div class="search-result-item" data-name="${escHtml(c.name)}">
          <span class="sri-flag">${getFlag(c.alpha2)}</span>
          <div class="sri-info">
            <div class="sri-name">${escHtml(c.name)}</div>
            <div class="sri-region">${getRiskLabel(c.risk)}</div>
          </div>
        </div>`).join('');
      sugg.classList.toggle('hidden', !m.length);
      sugg.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          input.value = el.dataset.name;
          sugg.classList.add('hidden');
        });
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.travel-form')) sugg.classList.add('hidden');
    });

    btn.addEventListener('click', () => renderTravelBrief(input.value.trim()));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') renderTravelBrief(input.value.trim()); });
  }

  function renderTravelBrief(query) {
    if (!query) return;
    const country = findCountryByName(query);
    if (!country) {
      document.getElementById('travel-result').classList.add('hidden');
      document.getElementById('travel-placeholder').innerHTML =
        `<div class="ncs-icon">?</div><div class="ncs-text">COUNTRY NOT FOUND</div><div class="ncs-sub">Try a different spelling</div>`;
      document.getElementById('travel-placeholder').classList.remove('hidden');
      return;
    }

    const { data } = country;
    const risk = data.risk;
    const color = getRiskColor(risk);

    const verdicts = [
      null,
      { text:'VERY SAFE TO VISIT',     cls:'verdict-safe'    }, // 1
      { text:'SAFE TO VISIT',           cls:'verdict-safe'    }, // 2
      { text:'GENERALLY SAFE',          cls:'verdict-safe'    }, // 3
      { text:'EXERCISE CAUTION',        cls:'verdict-caution' }, // 4
      { text:'SOME CAUTION ADVISED',    cls:'verdict-caution' }, // 5
      { text:'ELEVATED RISK',           cls:'verdict-avoid'   }, // 6
      { text:'HIGH RISK — RECONSIDER',  cls:'verdict-avoid'   }, // 7
      { text:'DO NOT TRAVEL',           cls:'verdict-danger'  }, // 8
      { text:'DO NOT TRAVEL',           cls:'verdict-danger'  }, // 9
      { text:'EXTREME DANGER — AVOID',  cls:'verdict-extreme' }, // 10
    ];

    const v = verdicts[Math.min(risk, 10)];

    const travelTips = getTravelTips(data, country.id);

    document.getElementById('tr-flag').textContent = getFlag(data.alpha2);
    document.getElementById('tr-country-name').textContent = data.name;
    document.getElementById('tr-verdict-badge').textContent = v.text;
    document.getElementById('tr-verdict-badge').className = `verdict-badge ${v.cls}`;

    // Gauge needle position
    const pct = ((risk - 1) / 9) * 100;
    document.getElementById('tr-gauge-fill').style.left = `${pct}%`;

    document.getElementById('tr-sections').innerHTML = travelTips;

    document.getElementById('travel-placeholder').classList.add('hidden');
    document.getElementById('travel-result').classList.remove('hidden');
  }

  function getTravelTips(data, countryId) {
    const risk = data.risk;
    const tags = data.tags || [];
    const air  = getAirAccess(countryId);

    const safetyLevel = risk <= 2 ? 'Very low' : risk <= 4 ? 'Low to moderate' :
      risk <= 6 ? 'Moderate to elevated' : risk <= 8 ? 'High' : 'Extreme';

    const crimeRisk = tags.some(t => ['crime','gangs','narco'].includes(t))
      ? 'Organised crime, gang activity, or narco-violence present. Avoid late-night travel in city centres.'
      : risk <= 3 ? 'Low crime risk. Standard precautions apply.' : 'Standard urban crime precautions advised.';

    const terrorRisk = tags.some(t => ['terrorism','jihadist'].includes(t))
      ? 'Active terrorism threat. Avoid crowded places, markets, and government buildings. Stay updated on local advisories.'
      : risk <= 4 ? 'Low terrorism risk.' : 'Terrorism vigilance required.';

    const politicalRisk = tags.some(t => ['war','invasion'].includes(t))
      ? '⛔ Active armed conflict. Do not enter conflict zones. Military/rebel activity widespread.'
      : tags.some(t => ['instability','coup','political'].includes(t))
      ? 'Political unrest possible. Avoid demonstrations. Situation can change rapidly.'
      : 'Politically stable. Monitor news.';

    const health = risk <= 3 ? 'Good healthcare infrastructure. Travel insurance recommended.' :
      risk <= 6 ? 'Healthcare may be limited outside capital. Travel insurance essential.' :
      'Healthcare severely limited. Bring medical supplies. Evacuation insurance critical.';

    const connectivity = tags.some(t => ['authoritarian','isolated'].includes(t))
      ? 'Internet may be restricted. VPN recommended. Inform contacts of your itinerary.'
      : 'Mobile coverage generally available in urban areas.';

    const airTierColors = { open:'#44ee88', limited:'#ffdd44', restricted:'#ff8844', charter:'#ff6622', closed:'#ff3333' };
    const airColor = airTierColors[air.tier] || '#aaa';
    const airBody  = `<span class="air-badge air-${air.tier}">${air.label}</span> ${air.note}${
      air.hubs.length ? ` <span class="air-hubs">Hub codes: ${air.hubs.join(' · ')}</span>` : ''
    }`;

    const sections = [
      { icon: '🛡️', title: 'OVERALL SAFETY',   body: `${safetyLevel} risk. ${data.info}` },
      { icon: '✈',  title: 'FLIGHT ACCESS',    body: airBody, isHtml: true },
      { icon: '🔫', title: 'CRIME & VIOLENCE',  body: crimeRisk },
      { icon: '💥', title: 'TERRORISM',         body: terrorRisk },
      { icon: '🏛️', title: 'POLITICAL CLIMATE', body: politicalRisk },
      { icon: '🏥', title: 'HEALTH & MEDICAL',  body: health },
      { icon: '📡', title: 'COMMUNICATIONS',    body: connectivity },
    ];

    return sections.map(s => `
      <div class="tr-section">
        <div class="tr-section-title">
          <span class="tr-section-icon">${s.icon}</span> ${s.title}
        </div>
        <div class="tr-section-body">${s.isHtml ? s.body : escHtml(s.body)}</div>
      </div>`).join('');
  }

  // ── COMPARE ───────────────────────────────────────────────────
  function initCompare() {
    initCompareSlot('a');
    initCompareSlot('b');
  }

  function initCompareSlot(slot) {
    const input = document.getElementById(`cmp-input-${slot}`);
    const sugg  = document.getElementById(`cmp-sugg-${slot}`);
    const allC  = Object.entries(COUNTRY_DATA).map(([id,d]) => ({id,...d}));

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { sugg.classList.add('hidden'); return; }
      const m = allC.filter(c => c.name.toLowerCase().includes(q)).slice(0,6);
      sugg.innerHTML = m.map(c => `
        <div class="search-result-item" data-name="${escHtml(c.name)}" data-id="${c.id}">
          <span class="sri-flag">${getFlag(c.alpha2)}</span>
          <div class="sri-info">
            <div class="sri-name">${escHtml(c.name)}</div>
            <div class="sri-region">${getRiskLabel(c.risk)}</div>
          </div>
        </div>`).join('');
      sugg.classList.toggle('hidden', !m.length);
      sugg.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          input.value = el.dataset.name;
          sugg.classList.add('hidden');
          setCompareSlot(slot, COUNTRY_DATA[el.dataset.id]);
        });
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest(`#cmp-slot-${slot}`)) sugg.classList.add('hidden');
    });
  }

  function setCompareSlot(slot, data) {
    if (slot === 'a') compareA = data; else compareB = data;

    const preview = document.getElementById(`cmp-preview-${slot}`);
    const color   = getRiskColor(data.risk);
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span class="cmp-preview-flag">${getFlag(data.alpha2)}</span>
        <span class="cmp-preview-name">${escHtml(data.name)}</span>
      </div>
      <div class="cmp-preview-risk" style="color:${color}">${getRiskLabel(data.risk)} · ${data.risk}/10</div>
      <div class="cmp-preview-bar">
        <div class="cmp-preview-fill" style="width:${data.risk*10}%;background:${color}"></div>
      </div>`;
    preview.classList.remove('hidden');

    if (document.getElementById(`cmp-input-${slot}`).value !== data.name) {
      document.getElementById(`cmp-input-${slot}`).value = data.name;
    }

    if (compareA && compareB) renderComparison();
  }

  function renderComparison() {
    const a = compareA, b = compareB;
    document.getElementById('compare-result').classList.remove('hidden');

    const colA = (val) => `<div class="cmp-col cmp-metric-val ${val === Math.min(a.risk,b.risk) ? 'cmp-winner' : ''}">${val}</div>`;
    const winA = a.risk < b.risk, winB = b.risk < a.risk;

    document.getElementById('cmp-head-a').innerHTML = `
      <div class="cmp-col-flag">${getFlag(a.alpha2)}</div>
      <div class="cmp-col-name">${escHtml(a.name)}</div>
      <div class="cmp-col-score" style="color:${getRiskColor(a.risk)}">${getRiskLabel(a.risk)}</div>`;
    document.getElementById('cmp-head-b').innerHTML = `
      <div class="cmp-col-flag">${getFlag(b.alpha2)}</div>
      <div class="cmp-col-name">${escHtml(b.name)}</div>
      <div class="cmp-col-score" style="color:${getRiskColor(b.risk)}">${getRiskLabel(b.risk)}</div>`;

    const metrics = [
      { label: 'RISK SCORE',
        a: `<span style="color:${getRiskColor(a.risk)};font-weight:bold">${a.risk}/10</span>`,
        b: `<span style="color:${getRiskColor(b.risk)};font-weight:bold">${b.risk}/10</span>`,
        winnerA: winA, winnerB: winB },
      { label: 'REGION',    a: a.region||'—', b: b.region||'—', winnerA:false, winnerB:false },
      { label: 'KEY RISKS',
        a: (a.tags||[]).slice(0,3).map(t=>`<span class="cp-tag ${getTagClass(t)}">${t}</span>`).join(' ')||'None',
        b: (b.tags||[]).slice(0,3).map(t=>`<span class="cp-tag ${getTagClass(t)}">${t}</span>`).join(' ')||'None',
        winnerA:false, winnerB:false },
      { label: 'ASSESSMENT', a: escHtml((a.info||'').slice(0,80)+'…'), b: escHtml((b.info||'').slice(0,80)+'…'), winnerA:false, winnerB:false },
      { label: 'SAFER FOR TRAVEL', a: a.risk<b.risk?'✓ YES':'—', b: b.risk<a.risk?'✓ YES':'—', winnerA:winA, winnerB:winB },
    ];

    document.getElementById('cmp-metrics').innerHTML = metrics.map(m => `
      <div class="cmp-metric-row">
        <div class="cmp-metric-label">${m.label}</div>
        <div class="cmp-metric-val ${m.winnerA ? 'cmp-winner' : ''}">${m.a}</div>
        <div class="cmp-metric-val ${m.winnerB ? 'cmp-winner' : ''}">${m.b}</div>
      </div>`).join('');
  }

  // ── COUNTRY SELECTED ─────────────────────────────────────────
  function onCountrySelected(data, id) {
    const noSel   = document.getElementById('no-country-selected');
    const profile = document.getElementById('country-profile');
    currentCountry = data;

    if (!data) {
      noSel.classList.remove('hidden');
      profile.classList.add('hidden');
      return;
    }

    // On mobile: auto-open the panel and update toggle button
    if (window.innerWidth <= 768) {
      const panel  = document.getElementById('intel-panel');
      const toggle = document.getElementById('mobile-panel-toggle');
      if (panel && !panel.classList.contains('mobile-open')) {
        panel.classList.add('mobile-open');
        if (toggle) toggle.textContent = '✕';
      }
    }

    switchTab('country');
    noSel.classList.add('hidden');
    profile.classList.remove('hidden');

    const color = getRiskColor(data.risk);
    document.getElementById('cp-flag').textContent   = getFlag(data.alpha2);
    document.getElementById('cp-name').textContent   = data.name;
    document.getElementById('cp-region').textContent = (data.region||'').toUpperCase();
    document.getElementById('cp-risk-label').textContent = 'THREAT ASSESSMENT';
    document.getElementById('cp-risk-fill').style.cssText  = `width:${data.risk*10}%;background:${color}`;
    document.getElementById('cp-risk-score').style.color   = color;
    document.getElementById('cp-risk-score').textContent   = `${getRiskLabel(data.risk)}  (${data.risk}/10)`;
    document.getElementById('cp-tags').innerHTML = (data.tags||[]).map(t =>
      `<span class="cp-tag ${getTagClass(t)}">${t}</span>`).join('');
    document.getElementById('cp-info').textContent = data.info||'';
    document.getElementById('cp-news').innerHTML =
      `<div class="news-item"><div class="ni-title" style="color:var(--text-dim);font-style:italic">Searching intelligence feed…</div></div>`;
    fetchCountryNews(data.name);
  }

  // ── EVENT DETAIL ──────────────────────────────────────────────
  function showEventDetail(ev) {
    switchTab('country');
    GeoMap.deselectCountry();
    currentCountry = null;

    const noSel  = document.getElementById('no-country-selected');
    const profile = document.getElementById('country-profile');
    noSel.classList.add('hidden');
    profile.classList.remove('hidden');

    const color = getEventColor(ev.type);
    const icon  = {war:'⚔️', terrorism:'💥', geopolitical:'🌐', instability:'⚠️', crime:'🔫'}[ev.type]||'⚠️';

    document.getElementById('cp-flag').textContent = icon;
    document.getElementById('cp-name').textContent = ev.name;
    document.getElementById('cp-region').textContent = ev.location.toUpperCase();
    document.getElementById('cp-risk-label').textContent = `SEVERITY · ${ev.type.toUpperCase()}`;
    document.getElementById('cp-risk-fill').style.cssText = `width:${ev.severity*10}%;background:${color}`;
    document.getElementById('cp-risk-score').style.color  = color;
    document.getElementById('cp-risk-score').textContent  = `${getRiskLabel(ev.severity)} (${ev.severity}/10)`;
    document.getElementById('cp-tags').innerHTML =
      [ev.type, ev.started ? `since ${ev.started}` : ''].filter(Boolean).map(t =>
        `<span class="cp-tag ${getTagClass(t)}">${t}</span>`).join('');
    document.getElementById('cp-info').textContent = ev.info;
    document.getElementById('cp-news').innerHTML =
      `<div class="news-item"><div class="ni-title" style="color:var(--text-dim);font-style:italic">Loading related intelligence…</div></div>`;
    fetchCountryNews(ev.name.split('–')[0].split('/')[0].trim(), true);
  }

  // ── COUNTRY NEWS ──────────────────────────────────────────────
  async function fetchCountryNews(term) {
    const el = document.getElementById('cp-news');
    if (!el) return;
    try {
      const kw  = term.toLowerCase().split(/[\s–\/]/)[0];
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(kw)}&mode=artlist&format=json&maxrecords=15&sort=DateDesc`;
      const res  = await fetch(url);
      const data = await res.json();
      const items = (data.articles || []).filter(a => a.title);
      if (!items.length) {
        el.innerHTML = `<div class="news-item"><div class="ni-title" style="color:var(--text-dim);font-style:italic">No recent GDELT matches. Check the Intel Feed tab for global headlines.</div></div>`;
        return;
      }
      el.innerHTML = items.slice(0,8).map(a => newsItemHTML(a.title, a.domain, a.seendate, a.url)).join('');
    } catch {
      el.innerHTML = `<div class="news-item"><div class="ni-title" style="color:var(--text-dim)">Feed temporarily unavailable</div></div>`;
    }
  }

  // ── FETCH NEWS ────────────────────────────────────────────────
  async function fetchNews() {
    try {
      let items = [];

      if (IS_LOCAL) {
        const res  = await fetch('/api/news');
        const json = await res.json();
        items = (json.items || []).map(i => ({ ...i, tier: 2 }));
      } else {
        // Deployed: fetch all tiers via rss2json CORS bridge
        const results = await Promise.allSettled(
          PUBLIC_FEEDS.map(async (feed) => {
            try {
              const res  = await fetch(RSS_TO_JSON + encodeURIComponent(feed.url));
              const data = await res.json();
              if (data.status !== 'ok' || !data.items) return [];
              return data.items.slice(0, 6).map(i => ({
                title:  (i.title || '').replace(/\s+/g,' ').trim(),
                source: feed.source,
                tier:   feed.tier,
                date:   i.pubDate || '',
                link:   i.link    || '',
              })).filter(i => i.title.length > 10);
            } catch { return []; }
          })
        );
        results.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value); });
        items.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      // Social media screening — fetch Reddit in parallel, tag as UNVERIFIED
      fetchSocialMedia().then(socialItems => {
        if (socialItems.length) {
          renderSocialLayer(socialItems);
        }
      });

      const sourcesLive = [...new Set(items.map(i => i.source))].length;
      document.getElementById('stat-news').textContent = sourcesLive || '--';
      setSignal('SIGNAL LIVE', false);
      setTickerItems(items);
    } catch {
      setSignal('SIGNAL LOST', true);
    }
  }

  // ── SOCIAL MEDIA SCREENING (Reddit — Unverified) ───────────────
  async function fetchSocialMedia() {
    const items = [];
    await Promise.allSettled(
      REDDIT_FEEDS.map(async (feed) => {
        try {
          const res  = await fetch(
            `https://www.reddit.com/r/${feed.sub}/hot.json?limit=8`,
            { headers: { 'Accept': 'application/json' } }
          );
          const data = await res.json();
          const posts = data?.data?.children || [];
          posts.forEach(p => {
            const d = p.data;
            if (!d.title || d.stickied || d.score < 500) return;
            items.push({
              title:    d.title,
              source:   feed.label,
              tier:     4,
              score:    d.score,
              link:     `https://reddit.com${d.permalink}`,
              date:     new Date(d.created_utc * 1000).toISOString(),
              isSocial: true,
            });
          });
        } catch { /* Reddit may block in some regions */ }
      })
    );
    return items.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  function renderSocialLayer(items) {
    const el = document.getElementById('social-feed');
    if (!el) return;
    el.innerHTML = items.map(item => `
      <a class="news-item social-item" href="${item.link}" target="_blank" rel="noopener" style="text-decoration:none;display:block;">
        <div class="ni-header">
          <span class="trust-badge trust-social">⚠ UNVERIFIED</span>
          <span class="ni-source social-src">${escHtml(item.source)}</span>
          <span class="ni-date">${timeAgo(item.date)}</span>
        </div>
        <div class="ni-title">${escHtml(item.title)}</div>
        <div class="social-disclaimer">Social media — requires cross-check with verified sources before treating as confirmed</div>
      </a>`).join('');
    document.getElementById('social-section').classList.remove('hidden');
  }

  async function fetchGdelt() {
    // GDELT's API supports CORS — always call directly regardless of environment
    try {
      const queries = [
        'conflict war military attack',
        'protest unrest crisis',
        'sanctions coup insurgency',
      ];
      const allArticles = [];
      for (const q of queries) {
        try {
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&format=json&maxrecords=20&sort=DateDesc`;
          const res  = await fetch(url);
          const data = await res.json();
          if (data.articles) {
            allArticles.push(...data.articles.map(a => ({
              title:   a.title,
              domain:  a.domain,
              url:     a.url,
              date:    a.seendate,
              country: a.sourcecountry || '',
            })));
          }
        } catch { /* one query failing is fine */ }
      }
      const seen   = new Set();
      const unique = allArticles.filter(a => {
        if (!a.title || seen.has(a.title)) return false;
        seen.add(a.title); return true;
      });
      unique.sort((a,b) => (b.date||'').localeCompare(a.date||''));
      renderGdeltList(unique.slice(0, 50));
    } catch { /* silent */ }
  }

  // ── RENDER GDELT ──────────────────────────────────────────────
  function renderGdeltList(articles) {
    const el = document.getElementById('gdelt-list');
    if (!el) return;
    if (!articles.length) {
      el.innerHTML = `<div class="news-item" style="padding:14px;color:var(--text-dim);font-size:11px;font-style:italic">Waiting for GDELT feed…</div>`;
      return;
    }
    el.innerHTML = articles.slice(0,30).map(a => {
      const trust = getSourceTrust(a.domain || a.source || '');
      return newsItemHTML(a.title, a.domain, a.date, a.url, trust.level);
    }).join('');
  }

  // ── EVENT CARDS ───────────────────────────────────────────────
  function renderEventCards() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';
    [...MAJOR_EVENTS].sort((a,b) => b.severity - a.severity).forEach(ev => {
      const color = getEventColor(ev.type);
      const card  = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <div class="ec-stripe" style="background:${color}"></div>
        <div class="ec-body">
          <div class="ec-name">${ev.name}</div>
          <div class="ec-location">${ev.location} · ${ev.started||''}</div>
          <div class="ec-info">${ev.info}</div>
        </div>
        <div class="ec-severity" style="color:${color}">
          ${[1,2,3,4,5].map(i=>`<div class="sev-pip ${i<=Math.round(ev.severity/2)?'active':''}"></div>`).join('')}
        </div>`;
      card.addEventListener('click', () => showEventDetail(ev));
      list.appendChild(card);
    });
  }

  // ── NEWS ITEM HTML ────────────────────────────────────────────
  function newsItemHTML(title, source, date, url, tier) {
    const src      = (source||'UNKNOWN').replace(/\./g,'-').slice(0,20);
    const srcClass = src.replace(/\s+/g,'-');
    const ago      = timeAgo(date);
    const link     = url ? `href="${url}" target="_blank" rel="noopener"` : '';

    // Infer trust tier from source name if not passed
    const trust    = typeof tier === 'number' ? tier : getSourceTrust(source).level;
    const trustInfo = trust === 1 ? { css:'trust-t1', lbl:'WIRE' }
                    : trust === 2 ? { css:'trust-t2', lbl:'VERIFIED' }
                    : trust === 3 ? { css:'trust-t3', lbl:'REPORTED' }
                    :               { css:'trust-social', lbl:'UNVERIFIED' };

    return `
      <a class="news-item" ${link} style="text-decoration:none;display:block;">
        <div class="ni-header">
          <span class="trust-badge ${trustInfo.css}">${trustInfo.lbl}</span>
          <span class="ni-source ${srcClass}">${escHtml((source||'').slice(0,16))}</span>
          ${ago ? `<span class="ni-date">${ago}</span>` : ''}
        </div>
        <div class="ni-title">${escHtml(title)}</div>
      </a>`;
  }

  // ── TICKER ────────────────────────────────────────────────────
  function setTickerItems(items) {
    const tape = document.getElementById('ticker-tape');
    if (!tape || !items.length) return;

    // Only tier 1–3 in ticker, not social media
    const filtered = items.filter(i => (i.tier || 3) <= 3);
    const duped = [...filtered, ...filtered];
    tape.innerHTML = duped.map(item => {
      const src   = (item.source||'').replace(/\s+/g,'-');
      const trust = item.tier === 1 ? 'trust-t1' : item.tier === 2 ? 'trust-t2' : 'trust-t3';
      return `<span class="ticker-item">
        <span class="ticker-source ni-source ${src}">${escHtml(item.source||'')}</span>
        <span class="ticker-title">${escHtml(item.title||'')}</span>
      </span><span class="ticker-sep">◆</span>`;
    }).join('');

    tape.style.transform = 'translateX(0)';
    tickerOffset = 0; lastTickerTs = null;
    if (tickerAnim) cancelAnimationFrame(tickerAnim);
    animateTicker();
  }

  function animateTicker() {
    const tape  = document.getElementById('ticker-tape');
    if (!tape) return;
    const halfW = tape.scrollWidth / 2;

    function step(ts) {
      if (!lastTickerTs) lastTickerTs = ts;
      const dt = (ts - lastTickerTs) / 1000;
      lastTickerTs = ts;
      tickerOffset = (tickerOffset + TICKER_SPEED * dt) % halfW;
      tape.style.transform = `translateX(-${tickerOffset}px)`;
      tickerAnim = requestAnimationFrame(step);
    }
    tickerAnim = requestAnimationFrame(step);
  }

  // ── HISTORICAL GPI DATA ───────────────────────────────────────
  function buildGpiHistory() {
    // 17 years: 2008–2024. Values are approximate risk (1–10) per year.
    // Key war/crisis shifts encoded. Countries not listed interpolate from current.
    return {
      // Ukraine: pre-Maidan safe → Donbas 2014 → full war 2022
      "804": [2,2,2,2,3,5,7,6,6,6,6,6,6,6,10,10,10],
      // Syria: stable → civil war 2011 → chaos → partial stabilise
      "760": [3,3,3,3,6,9,10,10,10,10,10,10,10,10,10,9,9],
      // Yemen: tense → war 2015
      "887": [5,5,6,6,6,8,10,10,10,10,10,10,10,10,10,10,10],
      // Sudan: darfur simmering → civil war 2023
      "729": [7,7,7,8,8,7,7,7,7,7,7,7,7,8,8,10,10],
      // Myanmar: military rule → brief opening → coup 2021
      "104": [7,7,7,7,7,6,5,5,5,5,5,6,8,10,10,10,10],
      // Libya: stable Gaddafi → collapse 2011
      "434": [3,3,3,4,9,9,9,9,9,9,9,9,9,8,8,8,8],
      // Afghanistan: steadily bad → worse post-Taliban 2021
      "4":   [9,9,9,9,9,9,9,9,9,9,9,9,10,10,10,10,10],
      // Iraq: war → recovering
      "368": [9,9,9,8,8,7,7,8,9,8,8,8,8,8,7,7,7],
      // Somalia: consistently awful
      "706": [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
      // DRC: chronic instability, worsening
      "180": [8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9],
      // Lebanon: stable → crisis 2019 → war
      "422": [5,5,4,4,5,6,6,6,6,6,7,7,8,8,8,8,8],
      // Venezuela: ok → collapse
      "862": [4,4,5,5,5,6,7,8,8,8,8,8,8,8,8,8,8],
      // Haiti: always fragile → worse
      "332": [6,6,7,7,7,7,7,7,7,7,8,8,8,8,9,9,9],
      // Mali: stable → coup+jihadists 2012
      "466": [4,4,4,5,9,9,9,9,9,9,9,9,9,9,9,9,9],
      // Russia: improving then war
      "643": [5,5,5,5,5,5,6,6,6,6,6,6,6,6,7,8,8],
    };
  }

  // ── LIVE TV ───────────────────────────────────────────────────
  function initLiveTV() {
    renderTvChannelGrid();

    document.getElementById('tv-close-btn').addEventListener('click', closeTvPlayer);
    document.getElementById('tv-popout-btn').addEventListener('click', popOutTv);
    document.getElementById('tv-float-close').addEventListener('click', closeTvFloat);
    document.getElementById('tv-float-size').addEventListener('click', toggleTvFloatSize);
    initTvDrag();
  }

  function renderTvChannelGrid() {
    const grid = document.getElementById('tv-channel-grid');
    if (!grid) return;

    const tiers = [
      { key: 'T2',    label: 'TIER 2 · VERIFIED JOURNALISM' },
      { key: 'T3',    label: 'TIER 3 · QUALITY REGIONAL' },
      { key: 'STATE', label: '⚠ STATE / GOVERNMENT CONTROLLED' },
    ];

    grid.innerHTML = tiers.map(tier => {
      const channels = TV_CHANNELS.filter(c => c.trust === tier.key);
      if (!channels.length) return '';
      return `
        <div class="tv-tier-label">${tier.label}</div>
        <div class="tv-channel-row">
          ${channels.map(ch => `
            <button class="tv-ch-btn ${ch.trust === 'STATE' ? 'state-media' : ''}"
                    data-id="${ch.id}"
                    title="${escHtml(ch.note)}">
              <span class="tv-ch-flag">${ch.flag}</span>
              <span class="tv-ch-name">${escHtml(ch.name)}</span>
            </button>`).join('')}
        </div>`;
    }).join('');

    grid.querySelectorAll('.tv-ch-btn').forEach(btn => {
      btn.addEventListener('click', () => selectTvChannel(btn.dataset.id));
    });
  }

  function selectTvChannel(id) {
    const ch = TV_CHANNELS.find(c => c.id === id);
    if (!ch) return;
    activeTvChannel = ch;

    // Update active state in grid
    document.querySelectorAll('.tv-ch-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.id === id));

    // Update playing badge
    const badge = document.getElementById('tv-playing-badge');
    badge.textContent = ch.name;
    badge.style.display = '';

    const wrap      = document.getElementById('tv-player-wrap');
    const unavail   = document.getElementById('tv-unavailable');
    const iframe    = document.getElementById('tv-iframe');
    const nameLbl   = document.getElementById('tv-player-channel-name');
    const trustLbl  = document.getElementById('tv-trust-label');
    const directBtn = document.getElementById('tv-direct-link');

    nameLbl.innerHTML = `${ch.flag} ${escHtml(ch.name)}`;

    // Trust label
    const tMap = { T2:'✓ VERIFIED JOURNALISM', T3:'✓ QUALITY REGIONAL', STATE:'⚠ STATE MEDIA — view critically' };
    const tCss = { T2:'trust-t2', T3:'trust-t3', STATE:'trust-social' };
    trustLbl.textContent = tMap[ch.trust] || '';
    trustLbl.className   = `trust-badge ${tCss[ch.trust] || ''}`;

    if (ch.ytId) {
      // YouTube embed via privacy-enhanced nocookie domain
      const src = `https://www.youtube-nocookie.com/embed/${ch.ytId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.src = src;
      directBtn.href = `https://www.youtube.com/watch?v=${ch.ytId}`;
      directBtn.textContent = '▶ Watch on YouTube';
      wrap.classList.remove('hidden');
      unavail.classList.add('hidden');

      // Sync float player if open
      if (tvFloatOpen) {
        document.getElementById('tv-float-iframe').src = src;
        document.getElementById('tv-float-title').innerHTML = `${ch.flag} ${escHtml(ch.name)}`;
      }
    } else if (ch.directUrl) {
      // No embeddable stream — show direct link
      iframe.src = '';
      document.getElementById('tv-unavail-msg').textContent = ch.name.toUpperCase() + ' — EMBED RESTRICTED';
      document.getElementById('tv-unavail-sub').textContent = ch.note;
      directBtn.href        = ch.directUrl;
      directBtn.textContent = `▶ Watch on ${ch.name} website`;
      wrap.classList.remove('hidden');
      unavail.classList.remove('hidden');
      // Hide the iframe container but keep footer visible
      document.getElementById('tv-player-container').style.display = 'none';
    } else {
      wrap.classList.add('hidden');
      unavail.classList.remove('hidden');
    }

    // Show player container normally for youtube channels
    if (ch.ytId) {
      document.getElementById('tv-player-container').style.display = '';
    }
  }

  function closeTvPlayer() {
    const iframe = document.getElementById('tv-iframe');
    iframe.src   = '';
    document.getElementById('tv-player-wrap').classList.add('hidden');
    document.getElementById('tv-playing-badge').style.display = 'none';
    document.querySelectorAll('.tv-ch-btn').forEach(b => b.classList.remove('active'));
    activeTvChannel = null;
  }

  function popOutTv() {
    if (!activeTvChannel) return;
    const ch       = activeTvChannel;
    const floatEl  = document.getElementById('tv-float');
    const floatIf  = document.getElementById('tv-float-iframe');
    const floatTtl = document.getElementById('tv-float-title');

    if (!ch.ytId) return; // can't float without embed

    floatIf.src    = `https://www.youtube-nocookie.com/embed/${ch.ytId}?autoplay=1&rel=0&modestbranding=1`;
    floatTtl.innerHTML = `${ch.flag} ${escHtml(ch.name)}`;

    floatEl.classList.remove('hidden');
    tvFloatOpen = true;

    // Position: bottom-right of map area
    floatEl.style.right  = '360px';
    floatEl.style.bottom = '50px';
    floatEl.style.left   = 'auto';
    floatEl.style.top    = 'auto';
  }

  function closeTvFloat() {
    const floatEl = document.getElementById('tv-float');
    const floatIf = document.getElementById('tv-float-iframe');
    floatIf.src   = '';
    floatEl.classList.add('hidden');
    tvFloatOpen   = false;
  }

  let _tvFloatLarge = false;
  function toggleTvFloatSize() {
    _tvFloatLarge = !_tvFloatLarge;
    const f = document.getElementById('tv-float');
    f.classList.toggle('tv-float-large', _tvFloatLarge);
    document.getElementById('tv-float-size').textContent = _tvFloatLarge ? '⊟' : '⊞';
  }

  function initTvDrag() {
    const el     = document.getElementById('tv-float');
    const handle = document.getElementById('tv-float-header');
    let dragging = false, ox = 0, oy = 0, startX = 0, startY = 0;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r  = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      startX = e.clientX; startY = e.clientY;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      el.style.left = `${ox + e.clientX - startX}px`;
      el.style.top  = `${oy + e.clientY - startY}px`;
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
      document.body.style.userSelect = '';
    });

    // Touch drag
    handle.addEventListener('touchstart', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      const t  = e.touches[0];
      const r  = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      startX = t.clientX; startY = t.clientY;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      const t = e.touches[0];
      el.style.left = `${ox + t.clientX - startX}px`;
      el.style.top  = `${oy + t.clientY - startY}px`;
    }, { passive: true });

    document.addEventListener('touchend', () => { dragging = false; });
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function findCountryByName(q) {
    const ql = q.toLowerCase();
    const entry = Object.entries(COUNTRY_DATA).find(([,d]) =>
      d.name.toLowerCase() === ql ||
      d.name.toLowerCase().startsWith(ql));
    if (!entry) return null;
    return { id: entry[0], data: entry[1] };
  }

  function escHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, showEventDetail };
})();

document.addEventListener('DOMContentLoaded', App.init);
