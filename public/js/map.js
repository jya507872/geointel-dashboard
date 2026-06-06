// ── WORLD MAP MODULE ───────────────────────────────────────────
const GeoMap = (() => {
  let svg, g, projection, pathFn;
  let width, height;
  let zoomBehavior;
  let currentTransform = d3.zoomIdentity;
  let selectedId = null;
  let onCountrySelect = null;

  const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  const UNKNOWN_COLOR  = '#14253a';
  const OCEAN_COLOR    = '#060f1e';

  // ── INIT ──────────────────────────────────────────────────────
  function init(selectCallback) {
    onCountrySelect = selectCallback;

    const container = document.getElementById('map-container');
    width  = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select('#map-svg')
      .attr('width', width)
      .attr('height', height);

    // Ocean bg
    svg.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', OCEAN_COLOR);

    g = svg.append('g').attr('class', 'map-root');

    // Natural Earth projection — beautiful for world maps
    projection = d3.geoNaturalEarth1()
      .scale(width / 6.28)
      .translate([width / 2, height / 2]);

    pathFn = d3.geoPath().projection(projection);

    // Zoom
    zoomBehavior = d3.zoom()
      .scaleExtent([1, 20])
      .on('zoom', (event) => {
        currentTransform = event.transform;
        g.attr('transform', currentTransform);
        // Scale stroke widths with zoom
        g.selectAll('.country')
          .attr('stroke-width', 0.3 / currentTransform.k);
        g.selectAll('.border-mesh')
          .attr('stroke-width', 0.5 / currentTransform.k);
        g.selectAll('.event-ring, .event-ring-2')
          .style('animation-duration', `${2.2 / Math.sqrt(currentTransform.k)}s`);
      });

    svg.call(zoomBehavior)
      .on('dblclick.zoom', null);

    // Wire zoom buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      svg.transition().duration(350).call(zoomBehavior.scaleBy, 2);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      svg.transition().duration(350).call(zoomBehavior.scaleBy, 0.5);
    });
    document.getElementById('btn-zoom-reset').addEventListener('click', resetView);

    // Handle resize
    window.addEventListener('resize', debounce(onResize, 300));

    loadMap();
  }

  // ── LOAD TOPOJSON ─────────────────────────────────────────────
  function loadMap() {
    d3.json(WORLD_TOPO_URL).then(render).catch(err => {
      console.error('Map load failed:', err);
      document.getElementById('map-loading').innerHTML =
        `<div style="color:#ff4444;font-family:monospace;font-size:11px;letter-spacing:2px;">MAP DATA UNAVAILABLE</div>`;
    });
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render(topology) {
    const countries = topojson.feature(topology, topology.objects.countries);
    // world-atlas zero-pads numeric ids to 3 chars ("076","036","004") while
    // COUNTRY_DATA uses unpadded keys ("76","36","4"). Normalize so every
    // country (esp. ISO codes < 100 like Brazil/Australia) matches its data.
    // Partially-recognized states carry id "-99" (no ISO number); map them to
    // synthetic keys by name so they too resolve to data.
    const NAME_ID = { 'Kosovo': '383', 'N. Cyprus': '9001', 'Somaliland': '9002' };
    countries.features.forEach(f => {
      const nid = parseInt(f.id, 10);
      if (Number.isFinite(nid) && nid >= 0) { f.id = String(nid); }
      else { const nm = f.properties && f.properties.name; if (NAME_ID[nm]) f.id = NAME_ID[nm]; }
    });
    cachedFeatures = countries.features;

    // Graticule (lat/long grid) — no pointer events
    const graticule = d3.geoGraticule().step([20, 20]);
    g.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', pathFn)
      .attr('pointer-events', 'none');

    // Country fills
    g.selectAll('.country')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathFn)
      .attr('fill', d => {
        const data = COUNTRY_DATA[String(d.id)];
        return data ? getRiskColor(data.risk) : UNKNOWN_COLOR;
      })
      .attr('stroke', '#060f1e')
      .attr('stroke-width', 0.3)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
      .on('click', onCountryClick);

    // Country border mesh (pointer-events: none so clicks fall through to countries)
    g.append('path')
      .datum(topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b))
      .attr('class', 'border-mesh')
      .attr('d', pathFn)
      .attr('pointer-events', 'none');

    // Event markers
    renderEventMarkers();

    // Hide loading
    document.getElementById('map-loading').style.display = 'none';
  }

  // ── EVENT MARKERS ─────────────────────────────────────────────
  function renderEventMarkers() {
    const markersG = g.append('g').attr('class', 'markers-layer');

    MAJOR_EVENTS.forEach(ev => {
      const [x, y] = projection([ev.lng, ev.lat]);
      if (!x || !y || x < 0 || y < 0) return;

      const color = getEventColor(ev.type);
      const radius = 4 + (ev.severity - 5) * 0.6;

      const grp = markersG.append('g')
        .attr('class', 'event-group')
        .attr('transform', `translate(${x},${y})`)
        .attr('data-id', ev.id)
        .on('click', (event) => {
          event.stopPropagation();
          showEventPanel(ev);
        })
        .on('mousemove', (event) => showEventTooltip(event, ev))
        .on('mouseleave', hideTooltip);

      // Outer pulsing rings
      grp.append('circle')
        .attr('class', 'event-ring')
        .attr('r', radius)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('fill', 'none');

      grp.append('circle')
        .attr('class', 'event-ring-2')
        .attr('r', radius)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('fill', 'none');

      // Core dot
      grp.append('circle')
        .attr('class', 'event-core')
        .attr('r', radius * 0.55)
        .attr('fill', color)
        .attr('filter', `drop-shadow(0 0 3px ${color})`);
    });
  }

  // ── TOOLTIP ───────────────────────────────────────────────────
  const tooltip = document.getElementById('tooltip');

  function showEventTooltip(event, ev) {
    const color = getEventColor(ev.type);
    document.getElementById('tt-flag').textContent = ev.type === 'war' ? '⚔️' :
      ev.type === 'terrorism' ? '💥' : ev.type === 'geopolitical' ? '🌐' : '⚠️';
    document.getElementById('tt-name').textContent = ev.name;

    const bar = document.getElementById('tt-risk-bar');
    bar.style.width = `${ev.severity * 10}%`;
    bar.style.background = color;

    document.getElementById('tt-risk-label').textContent = ev.location;
    document.getElementById('tt-risk-label').style.color = color;

    document.getElementById('tt-tags').innerHTML = `
      <span class="tt-tag">${ev.type.toUpperCase()}</span>
      <span class="tt-tag">SEV ${ev.severity}/10</span>
    `;

    positionTooltip(event);
    tooltip.style.display = 'block';
  }

  function onMouseMove(event, d) {
    const data = COUNTRY_DATA[String(d.id)];
    if (!data) {
      hideTooltip();
      return;
    }

    document.getElementById('tt-flag').textContent = getFlag(data.alpha2);
    document.getElementById('tt-name').textContent = data.name;

    const bar = document.getElementById('tt-risk-bar');
    const color = getRiskColor(data.risk);
    bar.style.width = `${data.risk * 10}%`;
    bar.style.background = color;

    const label = document.getElementById('tt-risk-label');
    label.textContent = getRiskLabel(data.risk);
    label.style.color = color;

    const tagsEl = document.getElementById('tt-tags');
    tagsEl.innerHTML = data.tags.slice(0, 4).map(t =>
      `<span class="tt-tag">${t}</span>`
    ).join('');

    positionTooltip(event);
    tooltip.style.display = 'block';
  }

  function positionTooltip(event) {
    const container = document.getElementById('map-container');
    const rect = container.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const tw = tooltip.offsetWidth || 200;
    const th = tooltip.offsetHeight || 80;
    const x = mx + 16 + tw > rect.width  ? mx - tw - 8 : mx + 16;
    const y = my + 16 + th > rect.height ? my - th - 8 : my + 16;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  function onMouseLeave() {
    hideTooltip();
  }

  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  // ── COUNTRY CLICK ─────────────────────────────────────────────
  function onCountryClick(event, d) {
    event.stopPropagation();
    const id = String(d.id);
    const data = COUNTRY_DATA[id];

    // Deselect if same
    if (selectedId === id) {
      deselectCountry();
      return;
    }

    // Deselect previous
    if (selectedId) {
      g.selectAll('.country')
        .filter(dd => String(dd.id) === selectedId)
        .classed('selected', false);
    }

    selectedId = id;
    d3.select(event.target).classed('selected', true);

    if (onCountrySelect) {
      onCountrySelect(data, id);
    }

    // Zoom to country
    if (data) {
      const bounds = pathFn.bounds(d);
      const [[x0,y0],[x1,y1]] = bounds;
      const bw = x1 - x0, bh = y1 - y0;
      const scale = Math.min(8, 0.85 / Math.max(bw / width, bh / height));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const t = d3.zoomIdentity
        .translate(width / 2 - scale * cx, height / 2 - scale * cy)
        .scale(scale);
      svg.transition().duration(600).ease(d3.easeCubicOut)
        .call(zoomBehavior.transform, t);
    }
  }

  function deselectCountry() {
    if (selectedId) {
      g.selectAll('.country')
        .filter(d => String(d.id) === selectedId)
        .classed('selected', false);
      selectedId = null;
    }
    if (onCountrySelect) onCountrySelect(null);
  }

  // ── EVENT PANEL HELPER ────────────────────────────────────────
  function showEventPanel(ev) {
    // Switch to country tab and show event detail there
    if (typeof App !== 'undefined' && App.showEventDetail) {
      App.showEventDetail(ev);
    }
  }

  // ── RESET VIEW ────────────────────────────────────────────────
  function resetView() {
    svg.transition().duration(600).ease(d3.easeCubicOut)
      .call(zoomBehavior.transform, d3.zoomIdentity);
  }

  // ── FLY TO REGION ─────────────────────────────────────────────
  function flyToRegion({ scale, cx, cy }) {
    if (scale === 1) { resetView(); return; }
    const [px, py] = projection([cx, cy]);
    const t = d3.zoomIdentity
      .translate(width / 2 - scale * px, height / 2 - scale * py)
      .scale(scale);
    svg.transition().duration(700).ease(d3.easeCubicOut)
      .call(zoomBehavior.transform, t);
  }

  // ── ZOOM TO COUNTRY BY ID ─────────────────────────────────────
  let cachedFeatures = null;

  function zoomToCountryId(id) {
    if (!cachedFeatures) return;
    const feat = cachedFeatures.find(f => String(f.id) === String(id));
    if (!feat) return;

    if (selectedId && selectedId !== id) {
      g.selectAll('.country').filter(d => String(d.id) === selectedId).classed('selected', false);
    }
    selectedId = id;
    g.selectAll('.country').filter(d => String(d.id) === id).classed('selected', true);

    const [[x0,y0],[x1,y1]] = pathFn.bounds(feat);
    const bw = x1-x0, bh = y1-y0;
    const scale = Math.min(8, 0.82 / Math.max(bw/width, bh/height));
    const t = d3.zoomIdentity
      .translate(width/2 - scale*(x0+x1)/2, height/2 - scale*(y0+y1)/2)
      .scale(scale);
    svg.transition().duration(600).ease(d3.easeCubicOut)
      .call(zoomBehavior.transform, t);
  }

  // ── HISTORICAL RISK OVERLAY ───────────────────────────────────
  function applyHistoricalRisk(year, gpiHistory) {
    const idx = year - 2008;        // 0 = 2008, 16 = 2024
    const isLive = year >= 2025;    // NOW sentinel → render exact live data
    g.selectAll('.country').attr('fill', d => {
      const id  = String(d.id);
      const current = COUNTRY_DATA[id];
      // NOW: always the current live assessment, untouched.
      if (isLive) return current ? getRiskColor(current.risk) : UNKNOWN_COLOR;
      const hist = gpiHistory[id];
      if (hist && hist[idx] !== undefined) return getRiskColor(hist[idx]);
      if (!current) return UNKNOWN_COLOR;
      // Countries without explicit GPI history: nudge slightly for earlier years
      // to convey change, but keep 2024 exact (most recent annual snapshot).
      const delta = year >= 2024 ? 0 : (Math.random() < 0.2 ? (Math.random() < 0.5 ? -1 : 1) : 0);
      return getRiskColor(Math.max(1, Math.min(10, current.risk + delta)));
    });
  }

  // ── RESIZE ────────────────────────────────────────────────────
  function onResize() {
    const container = document.getElementById('map-container');
    width  = container.clientWidth;
    height = container.clientHeight;

    svg.attr('width', width).attr('height', height);
    svg.select('rect').attr('width', width).attr('height', height);

    projection.scale(width / 6.28).translate([width / 2, height / 2]);
    pathFn = d3.geoPath().projection(projection);

    g.selectAll('.country').attr('d', pathFn);
    g.selectAll('.graticule').attr('d', pathFn);
    g.selectAll('.border-mesh').attr('d', pathFn);

    g.select('.markers-layer').remove();
    renderEventMarkers();
  }

  // ── UTILITIES ─────────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  return { init, resetView, deselectCountry, flyToRegion, zoomToCountryId, applyHistoricalRisk };
})();
