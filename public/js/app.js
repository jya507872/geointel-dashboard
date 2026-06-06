// ── GEOPOLITICAL INTELLIGENCE DASHBOARD — APP CONTROLLER ───────
const App = (() => {
  const NEWS_POLL_MS  = 5  * 60 * 1000;
  const GDELT_POLL_MS = 10 * 60 * 1000;
  const TICKER_SPEED  = 55; // px/s

  // When served from Netlify/any non-localhost host, call public APIs directly.
  // When running locally via `npm start`, use the Express proxy (cached, private).
  const IS_LOCAL = ['localhost','127.0.0.1',''].includes(window.location.hostname);

  // World news is aggregated server-side (Express /api/news locally, the
  // Netlify /news function in prod) from ~27 vetted journalistic sources —
  // see netlify/functions/news.js for the tiered source list.

  // Reddit public API — social media screening tier (UNVERIFIED, needs cross-check)
  const REDDIT_FEEDS = [
    { sub: 'worldnews',   label: 'r/worldnews' },
    { sub: 'geopolitics', label: 'r/geopolitics' },
    { sub: 'UkraineWarVideoReport', label: 'r/UkrWar' },
  ];

  let tickerAnim    = null;
  let tickerOffset  = 0;
  let lastTickerTs  = null;
  let currentCountry = null;
  let compareA = null, compareB = null;
  let travelOriginId    = null;   // numeric ISO id of "flying from" country
  let travelOriginAlpha2 = null;  // alpha2 for insurance lookup

  // Travel verdicts indexed 1–10 (round the score to index in)
  const VERDICTS = [
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

  // ── ADVISORY ALIAS MAPS ───────────────────────────────────────
  // State Dept feed name (normalized) → our dataset name (normalized)
  const US_ADV_ALIAS = {
    'burma': 'myanmar',
    'democratic republic of the congo': 'dr congo',
    'republic of the congo': 'congo rep',
    'czechia': 'czech republic',
    'bosnia and herzegovina': 'bosnia',
    'central african republic': 'cent african rep',
    'kyrgyz republic': 'kyrgyzstan',
    'united arab emirates': 'uae',
    'kingdom of denmark': 'denmark',
    'equatorial guinea': 'eq guinea',
  };
  // Our dataset name (normalized) → gov.uk advisory slug (verified 200s)
  const UK_SLUG_ALIAS = {
    'dr congo': 'democratic-republic-of-the-congo',
    'congo rep': 'congo',
    'south korea': 'south-korea',
    'north korea': 'north-korea',
    'united states': 'usa',
    'czech republic': 'czech-republic',
    'myanmar': 'myanmar',
    'turkiye': 'turkey',
    'cent african rep': 'central-african-republic',
    'eq guinea': 'equatorial-guinea',
  };

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
    fetchUsAdvisories();                                  // US State Dept advisory levels
    setInterval(fetchNews,  NEWS_POLL_MS);
    setInterval(fetchGdelt, GDELT_POLL_MS);
    setInterval(fetchUsAdvisories, 6 * 60 * 60 * 1000);   // refresh advisories every 6h
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
    const input      = document.getElementById('travel-input');
    const btn        = document.getElementById('travel-check-btn');
    const sugg       = document.getElementById('travel-suggestions');
    const originInput= document.getElementById('travel-origin-input');
    const originSugg = document.getElementById('travel-origin-suggestions');
    const originClear= document.getElementById('travel-origin-clear');
    const allC       = Object.entries(COUNTRY_DATA).map(([id,d]) => ({id,...d}));

    // ── Destination autocomplete ──────────────────────────────────
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

    // ── Origin autocomplete ───────────────────────────────────────
    function renderOriginSugg(q) {
      if (!q) { originSugg.classList.add('hidden'); return; }
      const m = allC.filter(c => c.name.toLowerCase().startsWith(q)).slice(0,5);
      originSugg.innerHTML = m.map(c => `
        <div class="search-result-item" data-id="${c.id}" data-name="${escHtml(c.name)}" data-alpha2="${c.alpha2||''}">
          <span class="sri-flag">${getFlag(c.alpha2)}</span>
          <div class="sri-info">
            <div class="sri-name">${escHtml(c.name)}</div>
            <div class="sri-region">${escHtml(c.region||'')}</div>
          </div>
        </div>`).join('');
      originSugg.classList.toggle('hidden', !m.length);
      originSugg.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          originInput.value      = el.dataset.name;
          travelOriginId         = el.dataset.id;
          travelOriginAlpha2     = el.dataset.alpha2;
          originSugg.classList.add('hidden');
          originClear.classList.remove('hidden');
        });
      });
    }

    originInput.addEventListener('input', () => {
      const q = originInput.value.trim().toLowerCase();
      if (!q) {
        travelOriginId = null; travelOriginAlpha2 = null;
        originClear.classList.add('hidden');
      }
      renderOriginSugg(q);
    });

    originClear.addEventListener('click', () => {
      originInput.value      = '';
      travelOriginId         = null;
      travelOriginAlpha2     = null;
      originClear.classList.add('hidden');
      originSugg.classList.add('hidden');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.travel-form')) {
        sugg.classList.add('hidden');
        originSugg.classList.add('hidden');
      }
    });

    btn.addEventListener('click', () => renderTravelBrief(input.value.trim()));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') renderTravelBrief(input.value.trim()); });
    originInput.addEventListener('keydown', e => { if (e.key === 'Enter') { originSugg.classList.add('hidden'); renderTravelBrief(input.value.trim()); } });
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

    const travelTips = getTravelTips(data, country.id, travelOriginId, travelOriginAlpha2);

    document.getElementById('tr-flag').textContent = getFlag(data.alpha2);
    document.getElementById('tr-country-name').textContent = data.name;

    // Apply baseline verdict + gauge immediately (false = baseline, not live)
    applyTravelVerdict(risk, false);

    document.getElementById('tr-sections').innerHTML = travelTips;

    // Load the live-adjusted assessment, then re-apply verdict with the
    // blended score once government advisories + GDELT resolve.
    loadLiveAssessment(data, 'tr-live-signal', 'tr-asof-date').then(blend => {
      if (blend && typeof blend.score === 'number') applyTravelVerdict(blend.score, true);
    });

    document.getElementById('travel-placeholder').classList.add('hidden');
    document.getElementById('travel-result').classList.remove('hidden');
  }

  // Apply verdict badge + gauge needle from a score. `isLive` flags that the
  // score reflects the blended live-adjusted figure (vs. the GPI baseline).
  function applyTravelVerdict(score, isLive) {
    const v = VERDICTS[Math.min(Math.max(Math.round(score), 1), 10)];
    const badge = document.getElementById('tr-verdict-badge');
    badge.textContent = v.text + (isLive ? '  · LIVE' : '');
    badge.className = `verdict-badge ${v.cls}${isLive ? ' verdict-live' : ''}`;
    const pct = ((Math.max(1, Math.min(10, score)) - 1) / 9) * 100;
    document.getElementById('tr-gauge-fill').style.left = `${pct}%`;
  }

  function getTravelTips(data, countryId, originId, originAlpha2) {
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

    const healthBase = risk <= 3 ? 'Good healthcare infrastructure.' :
      risk <= 6 ? 'Healthcare may be limited outside capital.' :
      'Healthcare severely limited. Bring medical supplies. Evacuation insurance critical.';

    const connectivity = tags.some(t => ['authoritarian','isolated'].includes(t))
      ? 'Internet may be restricted. VPN recommended. Inform contacts of your itinerary.'
      : 'Mobile coverage generally available in urban areas.';

    const airBody = `<span class="air-badge air-${air.tier}">${air.label}</span> ${escHtml(air.note)}${
      air.hubs.length ? ` <span class="air-hubs">Hub codes: ${air.hubs.join(' · ')}</span>` : ''
    }`;

    const airlinesHtml    = buildAirlinesHTML(countryId, data.region, originId);
    const insuranceHtml   = buildInsuranceHTML(originAlpha2, risk);
    const healthBody      = healthBase + ' Travel insurance essential.' + insuranceHtml;

    const sections = [
      { icon: '🛡️', title: 'OVERALL SAFETY',    body: `${safetyLevel} risk. ${escHtml(data.info)}`, isHtml: true },
      { icon: '📈', title: 'LIVE-ADJUSTED ASSESSMENT', body: `<div id="tr-live-signal" class="live-signal">${liveSignalLoadingHTML()}</div>`, isHtml: true },
      { icon: '✈',  title: 'AIRLINES & ACCESS',  body: airBody + airlinesHtml, isHtml: true },
      { icon: '🔫', title: 'CRIME & VIOLENCE',   body: escHtml(crimeRisk), isHtml: true },
      { icon: '💥', title: 'TERRORISM',          body: escHtml(terrorRisk), isHtml: true },
      { icon: '🏛️', title: 'POLITICAL CLIMATE',  body: escHtml(politicalRisk), isHtml: true },
      { icon: '🏥', title: 'HEALTH & INSURANCE', body: healthBody, isHtml: true },
      { icon: '📡', title: 'COMMUNICATIONS',     body: escHtml(connectivity), isHtml: true },
    ];

    return sections.map(s => `
      <div class="tr-section">
        <div class="tr-section-title">
          <span class="tr-section-icon">${s.icon}</span> ${s.title}
        </div>
        <div class="tr-section-body">${s.body}</div>
      </div>`).join('');
  }

  // ── AIRLINE CARDS ─────────────────────────────────────────────
  function buildAirlinesHTML(destCountryId, destRegion, originId) {
    const national    = getCarriersByCountryId(destCountryId);
    const regional    = REGION_HUBS[destRegion] || [];

    // De-duplicate by code across all lists
    const seen   = new Set();
    const unique = (arr) => arr.filter(a => { if (seen.has(a.code)) return false; seen.add(a.code); return true; });

    let primary   = unique(national);
    let secondary = unique(regional);
    let universal = unique(UNIVERSAL_CONNECTORS);

    // If origin specified, find that country's region carriers too (for route hints)
    let originRegionalNote = '';
    if (originId) {
      const originData = COUNTRY_DATA[String(originId)];
      if (originData) {
        const originRegion = originData.region || '';
        const originCarriers = getCarriersByCountryId(originId);
        const extraOrigin    = unique(originCarriers);
        if (extraOrigin.length) {
          // Prepend origin's national carriers as "likely best route"
          primary = unique([...extraOrigin, ...primary]);
          originRegionalNote = `<div class="airline-origin-note">Route carriers from <strong>${escHtml(originData.name)}</strong> highlighted first</div>`;
        }
      }
    }

    // Build card HTML for a carrier list
    const buildCards = (carriers) => carriers.map(c => `
      <a class="airline-card" href="${escHtml(c.url)}" target="_blank" rel="noopener">
        <span class="airline-code">${escHtml(c.code)}</span>
        <div class="airline-info">
          <div class="airline-name">${escHtml(c.name)}</div>
          ${c.note ? `<div class="airline-note">${escHtml(c.note)}</div>` : ''}
        </div>
        <span class="airline-book">BOOK →</span>
      </a>`).join('');

    let html = '';

    if (primary.length) {
      html += `<div class="airline-section-label">${originId ? 'RECOMMENDED AIRLINES' : 'NATIONAL & MAJOR CARRIERS'}</div>`;
      if (originRegionalNote) html += originRegionalNote;
      html += `<div class="airline-cards">${buildCards(primary)}</div>`;
    }

    if (secondary.length) {
      html += `<div class="airline-section-label" style="margin-top:10px">REGIONAL HUB CARRIERS</div>`;
      html += `<div class="airline-cards">${buildCards(secondary)}</div>`;
    }

    if (!primary.length && !secondary.length && universal.length) {
      html += `<div class="airline-section-label">GLOBAL CONNECTORS</div>`;
      html += `<div class="airline-cards">${buildCards(universal)}</div>`;
    } else if (universal.length) {
      html += `<div class="airline-section-label" style="margin-top:10px">GLOBAL CONNECTORS</div>`;
      html += `<div class="airline-cards">${buildCards(universal)}</div>`;
    }

    return html ? `<div class="airline-block">${html}</div>` : '';
  }

  // ── INSURANCE LINKS ───────────────────────────────────────────
  function buildInsuranceHTML(originAlpha2, destRisk) {
    const providers = getInsuranceByAlpha2(originAlpha2);
    if (!providers.length) return '';

    const urgencyNote = destRisk >= 7
      ? '<div class="insurance-urgency">⚠ High-risk destination — <strong>comprehensive medical evacuation coverage essential</strong></div>'
      : destRisk >= 5
      ? '<div class="insurance-urgency">Consider a plan with medical evacuation and trip cancellation cover.</div>'
      : '';

    const links = providers.map(p => `
      <a class="insurance-link" href="${escHtml(p.url)}" target="_blank" rel="noopener">
        <span class="insurance-name">${escHtml(p.name)}</span>
        ${p.note ? `<span class="insurance-note">${escHtml(p.note)}</span>` : ''}
      </a>`).join('');

    return `<div class="insurance-block">
      <div class="insurance-label">RECOMMENDED TRAVEL INSURANCE${originAlpha2 ? '' : ' (GLOBAL)'}</div>
      ${urgencyNote}
      <div class="insurance-links">${links}</div>
    </div>`;
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
    loadLiveAssessment(data, 'cp-live-signal');
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

  // ── LIVE ACTIVITY SIGNAL (GDELT, updates ~every 15 min) ───────
  // Reads conflict-related news intensity for a country over the last
  // 14 days and compares the recent week to the prior week to derive a
  // genuinely daily-fresh trend that sits on top of the annual GPI base.
  const _liveSignalCache = {}; // name → { ts, sig }

  async function fetchLiveSignal(name) {
    // Cache for 30 min to avoid hammering GDELT on repeated selections
    const cached = _liveSignalCache[name];
    if (cached && (Date.now() - cached.ts) < 30 * 60 * 1000) return cached.sig;

    try {
      const terms = 'conflict OR attack OR clashes OR unrest OR protest OR military OR strike OR killed OR violence OR crisis OR sanctions';
      const q   = `"${name}" (${terms})`;
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=timelinevol&timespan=14d&format=json`;
      // Abort if GDELT is slow so it can't stall the advisory display
      const ctrl = new AbortController();
      const to   = setTimeout(() => ctrl.abort(), 8000);
      const res  = await fetch(url, { signal: ctrl.signal });
      const json = await res.json();
      clearTimeout(to);
      const series = json?.timeline?.[0]?.data || [];
      if (series.length < 4) { _liveSignalCache[name] = { ts: Date.now(), sig: null }; return null; }

      const vals  = series.map(d => +d.value || 0);
      const dates = series.map(d => d.date || '');
      const half  = Math.floor(vals.length / 2);
      const prior  = vals.slice(0, half);
      const recent = vals.slice(half);
      const avg = a => a.reduce((s,x) => s + x, 0) / (a.length || 1);
      const rAvg = avg(recent), pAvg = avg(prior);
      const ratio = pAvg > 0 ? rAvg / pAvg : (rAvg > 0 ? 2 : 1);

      // rAvg is % of all global news coverage mentioning country + conflict terms
      const intensity = rAvg >= 0.15 ? 'High' : rAvg >= 0.05 ? 'Elevated' : rAvg >= 0.012 ? 'Moderate' : 'Low';
      const trend = ratio >= 1.3 ? 'escalating' : ratio <= 0.75 ? 'easing' : 'steady';
      const sig = { intensity, trend, ratio, asOf: parseGdeltDate(dates[dates.length - 1]) };
      _liveSignalCache[name] = { ts: Date.now(), sig };
      return sig;
    } catch {
      return null;
    }
  }

  function parseGdeltDate(s) {
    // GDELT dates look like "20260606T120000Z" or "20260606000000"
    const m = String(s).match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return 'today';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(m[3],10)} ${MONTHS[parseInt(m[2],10)-1]} ${m[1]}`;
  }

  function liveSignalLoadingHTML() {
    return `<div class="ls-row"><span class="ls-live-dot"></span><span class="ls-label">Reading live signal…</span></div>`;
  }

  function liveSignalHTML(sig) {
    if (!sig) {
      return `<div class="ls-row"><span class="ls-live-dot ls-dim"></span><span class="ls-label ls-muted">Live signal unavailable right now — try again shortly</span></div>`;
    }
    const trendInfo = {
      escalating: { arrow:'▲', cls:'ls-up',   word:'ESCALATING' },
      steady:     { arrow:'▬', cls:'ls-flat', word:'STEADY' },
      easing:     { arrow:'▼', cls:'ls-down', word:'EASING' },
    }[sig.trend];
    const intCls = { High:'ls-int-high', Elevated:'ls-int-elev', Moderate:'ls-int-mod', Low:'ls-int-low' }[sig.intensity];
    return `
      <div class="ls-row">
        <span class="ls-live-dot"></span>
        <span class="ls-label">LIVE · as of ${sig.asOf}</span>
      </div>
      <div class="ls-body">
        <span class="ls-intensity ${intCls}">${sig.intensity.toUpperCase()} INTENSITY</span>
        <span class="ls-trend ${trendInfo.cls}">${trendInfo.arrow} ${trendInfo.word}</span>
      </div>
      <div class="ls-note">Conflict-related news activity vs. the prior week · GDELT, refreshed every ~15 min</div>`;
  }

  // ── GOVERNMENT TRAVEL ADVISORIES ──────────────────────────────
  function normName(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim();
  }

  // US State Dept — single RSS feed lists every country with Level 1–4.
  // No CORS on the source, so bridge through rss2json (same as news feeds).
  let usAdvisoryStore = null; // normName → { level, label, date }

  async function fetchUsAdvisories() {
    // Server-side fetch+parse (Netlify function in prod, Express route locally)
    // avoids CORS and the 10-item cap that public RSS proxies impose.
    const url = IS_LOCAL ? '/api/advisories' : '/.netlify/functions/advisories';
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.items || !data.items.length) return;
      const store = {};
      data.items.forEach(it => {
        let key = normName(it.name).replace(/^the /,'').replace(/ travel advisory$/,'');
        key = US_ADV_ALIAS[key] || key;
        // The feed can list a country more than once (summary + advisory).
        // Keep the most severe level so the display is deterministic & conservative.
        const prev = store[key];
        if (!prev || it.level > prev.level) {
          store[key] = { level: it.level, label: it.label || '', date: it.date || '' };
        }
      });
      if (Object.keys(store).length) usAdvisoryStore = store;
    } catch { /* advisories simply won't show */ }
  }

  function getUsAdvisory(name) {
    if (!usAdvisoryStore) return null;
    return usAdvisoryStore[normName(name)] || null;
  }

  // UK FCDO — per-country JSON API, CORS-enabled, fetched on demand.
  const _ukAdvCache = {}; // slug → { ts, v }

  function ukSlug(name) {
    const k = normName(name);
    return UK_SLUG_ALIAS[k] || k.replace(/\s+/g,'-');
  }

  async function fetchUkAdvisory(name) {
    const slug = ukSlug(name);
    const c = _ukAdvCache[slug];
    if (c && (Date.now() - c.ts) < 6 * 3600 * 1000) return c.v;
    try {
      const res = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`);
      if (!res.ok) { _ukAdvCache[slug] = { ts: Date.now(), v: null }; return null; }
      const d = await res.json();
      const status = (d.details && d.details.alert_status) || [];
      const v = { status, date: (d.public_updated_at || '').slice(0,10),
                  url: `https://www.gov.uk/foreign-travel-advice/${slug}` };
      _ukAdvCache[slug] = { ts: Date.now(), v };
      return v;
    } catch { _ukAdvCache[slug] = { ts: Date.now(), v: null }; return null; }
  }

  function ukSeverity(status) {
    if (!status || !status.length) return { sev: 0, label: 'No specific warning' };
    const has = s => status.includes(s);
    if (has('avoid_all_travel_to_whole_country'))          return { sev: 4, label: 'Advise against ALL travel' };
    if (has('avoid_all_but_essential_travel_to_whole_country')) return { sev: 3, label: 'Against all but essential travel' };
    if (has('avoid_all_travel_to_parts'))                  return { sev: 3, label: 'Against all travel to parts' };
    if (has('avoid_all_but_essential_travel_to_parts'))    return { sev: 2, label: 'Against essential-only travel to parts' };
    return { sev: 1, label: 'Active advisory' };
  }

  // ── BLENDED LIVE SCORE ────────────────────────────────────────
  // Annual GPI baseline, nudged by live GDELT trend, then floored by the
  // (authoritative) government advisories. Advisories only ever raise the
  // score — a warning can't certify safety. Result clamped to 1–10.
  function computeLiveScore(base, gdeltSig, usAdv, ukAdv) {
    let score = base;
    const reasons = [];

    if (gdeltSig) {
      const mag = { High:1.2, Elevated:0.8, Moderate:0.5, Low:0.3 }[gdeltSig.intensity] || 0.4;
      if (gdeltSig.trend === 'escalating') { score += mag; reasons.push(`↑ escalating news activity (+${mag.toFixed(1)})`); }
      else if (gdeltSig.trend === 'easing') { const d = Math.min(mag, 0.8); score -= d; reasons.push(`↓ easing news activity (−${d.toFixed(1)})`); }
    }

    const floors = [];
    if (usAdv) { const f = { 4:8.5, 3:6.5, 2:4.5, 1:0 }[usAdv.level] || 0; if (f) floors.push({ f, why:`US State Dept Level ${usAdv.level}` }); }
    if (ukAdv) { const s = ukSeverity(ukAdv.status); const f = { 4:8.5, 3:7, 2:5.5, 1:0, 0:0 }[s.sev] || 0; if (f) floors.push({ f, why:`UK FCDO: ${s.label}` }); }
    const top = floors.sort((a,b) => b.f - a.f)[0];
    if (top && top.f > score) { score = score * 0.35 + top.f * 0.65; reasons.push(`floor raised by ${top.why}`); }

    score = Math.max(1, Math.min(10, score));
    const rounded = Math.round(score * 10) / 10;
    return { score: rounded, delta: Math.round((rounded - base) * 10) / 10, reasons };
  }

  function fmtAdvDate(d) {
    const t = new Date(d);
    if (isNaN(t)) return '';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
  }

  // ── UNIFIED LIVE ASSESSMENT RENDER ────────────────────────────
  function liveAssessmentHTML(data, gdeltSig, usAdv, ukAdv, blend) {
    const base   = data.risk;
    const adjCol = getRiskColor(Math.round(blend.score));
    const baseCol= getRiskColor(base);
    const deltaTxt = blend.delta > 0 ? `▲ +${blend.delta}` : blend.delta < 0 ? `▼ ${blend.delta}` : '▬ no change';
    const deltaCls = blend.delta > 0 ? 'ls-up' : blend.delta < 0 ? 'ls-down' : 'ls-flat';

    // Blended score header
    let html = `
      <div class="la-score">
        <span class="la-base">Baseline <b style="color:${baseCol}">${base}</b></span>
        <span class="la-arrow">→</span>
        <span class="la-adj">Live-adjusted <b style="color:${adjCol}">${blend.score}</b></span>
        <span class="la-delta ${deltaCls}">${deltaTxt}</span>
      </div>`;

    // Advisory badges
    let badges = '';
    if (usAdv) {
      const c = { 1:'#44ee88', 2:'#ffdd44', 3:'#ff8844', 4:'#ff3b3b' }[usAdv.level] || '#9fb6c8';
      badges += `<a class="adv-badge" style="border-color:${c};color:${c}" href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html" target="_blank" rel="noopener">🇺🇸 US Level ${usAdv.level}${usAdv.date ? ` <span class="adv-date">${fmtAdvDate(usAdv.date)}</span>` : ''}</a>`;
    }
    if (ukAdv) {
      const s = ukSeverity(ukAdv.status);
      const c = ['#9fb6c8','#ffdd44','#ffbb44','#ff8844','#ff3b3b'][s.sev] || '#9fb6c8';
      badges += `<a class="adv-badge" style="border-color:${c};color:${c}" href="${escHtml(ukAdv.url)}" target="_blank" rel="noopener">🇬🇧 UK FCDO · ${escHtml(s.label)}${ukAdv.date ? ` <span class="adv-date">${ukAdv.date}</span>` : ''}</a>`;
    }
    if (!usAdv && !ukAdv) badges = `<span class="adv-none">No US/UK government advisory matched for this country</span>`;
    html += `<div class="adv-badges">${badges}</div>`;

    // GDELT live signal
    html += liveSignalHTML(gdeltSig);

    // Reasons for the adjustment
    if (blend.reasons.length) {
      html += `<div class="la-reasons"><span class="la-reasons-lbl">WHAT MOVED IT:</span> ${blend.reasons.map(escHtml).join(' · ')}</div>`;
    }
    return html;
  }

  async function loadLiveAssessment(data, elId, asOfElId) {
    const el = document.getElementById(elId);
    if (!el) return null;
    el.innerHTML = liveSignalLoadingHTML();
    const [gdeltSig, ukAdv] = await Promise.all([
      fetchLiveSignal(data.name),
      fetchUkAdvisory(data.name),
    ]);
    const usAdv = getUsAdvisory(data.name);
    const blend = computeLiveScore(data.risk, gdeltSig, usAdv, ukAdv);

    const cur = document.getElementById(elId);
    if (cur) cur.innerHTML = liveAssessmentHTML(data, gdeltSig, usAdv, ukAdv, blend);
    if (asOfElId && gdeltSig) {
      const a = document.getElementById(asOfElId);
      if (a) a.textContent = gdeltSig.asOf;
    }
    return blend;
  }

  // ── FETCH NEWS ────────────────────────────────────────────────
  async function fetchNews() {
    try {
      let items = [];

      // Both environments use a server-side aggregator (Express locally,
      // Netlify function in prod) that fetches ~27 vetted journalistic feeds,
      // tier-tags and de-duplicates them. Avoids CORS + the rss2json item cap.
      const url = IS_LOCAL ? '/api/news' : '/.netlify/functions/news';
      const res  = await fetch(url);
      const json = await res.json();
      items = (json.items || []).map(i => ({
        title:  i.title || '',
        source: i.source || '',
        tier:   i.tier || 3,
        date:   i.date || '',
        link:   i.link || '',
      })).filter(i => i.title.length > 10);
      items.sort((a, b) => new Date(b.date) - new Date(a.date));

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
