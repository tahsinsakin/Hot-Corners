(() => {
  'use strict';

  // If an older copy is still running in this page (e.g. after the extension
  // was updated), tell it to stop before this one takes over.
  const SHUTDOWN = 'hot-corners:shutdown';
  window.dispatchEvent(new Event(SHUTDOWN));

  let settings = HC.merge(null);
  let zone = null;       // corner the cursor is in right now
  let firedZone = null;  // corner that already fired; must be left before it fires again
  let timer = 0;
  let overview = null;
  let dead = false;

  const alive = () => {
    try { return !dead && !!(chrome.runtime && chrome.runtime.id); } catch { return false; }
  };

  const send = (msg) => {
    if (!alive()) { shutdown(); return Promise.resolve(null); }
    return chrome.runtime.sendMessage(msg).catch(() => null);
  };

  // F11 browser fullscreen leaves fullscreenElement null, so corners still work there;
  // only page fullscreen (a video, a game) is skipped when the option is on.
  let pausedUntil = 0;
  HC.loadPause().then((p) => { pausedUntil = p; }).catch(() => {});

  const isActive = () =>
    settings.enabled &&
    !HC.isPaused(pausedUntil) &&
    !settings.disabledSites.includes(location.hostname) &&
    !(settings.ignoreFullscreen && document.fullscreenElement);

  // Modifier keys currently held, kept fresh from mouse and keyboard events.
  const mods = { shift: false, ctrl: false, alt: false };
  const readMods = (e) => { mods.shift = e.shiftKey; mods.ctrl = e.ctrlKey; mods.alt = e.altKey; };
  const modsOk = (z) => {
    const m = (settings.corners[z] && settings.corners[z].modifier) || 'none';
    return m === 'none' || mods[m] === true;
  };

  HC.load().then((s) => { settings = s; }).catch(() => {});

  const onStorage = (changes, area) => {
    if (area === 'sync' && changes.settings) {
      settings = HC.merge(changes.settings.newValue);
    } else if (area === 'local' && changes.pausedUntil) {
      pausedUntil = changes.pausedUntil.newValue || 0;
    } else {
      return;
    }
    if (!isActive()) reset();
  };
  chrome.storage.onChanged.addListener(onStorage);

  function reset() {
    clearTimeout(timer);
    timer = 0;
    zone = null;
    firedZone = null;
    mods.shift = mods.ctrl = mods.alt = false;
  }

  function zoneAt(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = settings.size;
    const left = x <= s;
    const right = x >= w - 1 - s;
    const top = y <= s;
    const bottom = y >= h - 1 - s;
    if (top && left) return 'tl';
    if (top && right) return 'tr';
    if (bottom && left) return 'bl';
    if (bottom && right) return 'br';
    return null;
  }

  function disarm() {
    clearTimeout(timer);
    timer = 0;
  }

  // Start (or stop) the countdown for the corner the cursor is in.
  function arm() {
    if (!zone || zone === firedZone || !isActive()) { disarm(); return; }
    const action = settings.corners[zone] && settings.corners[zone].action;
    if (!action || action === 'none' || !modsOk(zone)) { disarm(); return; }
    if (!timer) {
      const z = zone;
      timer = setTimeout(() => fire(z), settings.delay);
    }
  }

  function onMove(e) {
    if (!alive()) { shutdown(); return; }
    readMods(e);
    if (e.buttons !== 0) { disarm(); zone = null; return; } // dragging / selecting
    const z = zoneAt(e.clientX, e.clientY);
    if (z !== zone) {
      disarm();
      zone = z;
      if (!z) firedZone = null;
    }
    arm();
  }

  // Pressing the modifier while already resting in a corner should also work.
  function onKeyState(e) {
    readMods(e);
    if (zone) arm();
  }

  function onOut(e) {
    if (!e.relatedTarget) reset(); // cursor left the page
  }

  function fire(z) {
    timer = 0;
    if (z !== zone || !isActive() || !modsOk(z)) return;
    firedZone = z;
    const c = settings.corners[z];
    if (settings.feedback) pulse(z);
    run(c.action, c.url);
  }

  function run(action, url) {
    switch (action) {
      case 'tabOverview': toggleOverview(); break;
      case 'goBack': history.back(); break;
      case 'goForward': history.forward(); break;
      case 'scrollTop': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'scrollBottom':
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        break;
      default: send({ type: 'action', action, url });
    }
  }

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pulse(z) {
    const el = document.createElement('hot-corners-pulse');
    const size = 160;
    const pos = {
      tl: `left:${-size / 2}px;top:${-size / 2}px;`,
      tr: `right:${-size / 2}px;top:${-size / 2}px;`,
      bl: `left:${-size / 2}px;bottom:${-size / 2}px;`,
      br: `right:${-size / 2}px;bottom:${-size / 2}px;`,
    }[z];
    el.setAttribute('style',
      'all:initial;position:fixed;' + pos +
      `width:${size}px;height:${size}px;border-radius:50%;pointer-events:none;` +
      'z-index:2147483647;background:radial-gradient(circle,rgba(255,190,50,.6) 0%,rgba(255,150,0,0) 70%);');
    document.documentElement.appendChild(el);
    const frames = reduceMotion()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: 'scale(.4)' },
          { opacity: 1, transform: 'scale(1)', offset: 0.35 },
          { opacity: 0, transform: 'scale(1.25)' },
        ];
    el.animate(frames, { duration: 520, easing: 'ease-out' }).onfinish = () => el.remove();
  }

  // ---------- tab overview (Mission Control) ----------

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .backdrop {
      position: fixed; inset: 0; display: flex; flex-direction: column;
      background: rgba(14, 15, 19, .74);
      -webkit-backdrop-filter: blur(20px) saturate(150%);
      backdrop-filter: blur(20px) saturate(150%);
      color: #eef0f4;
      font: 13px/1.4 "Segoe UI", system-ui, -apple-system, sans-serif;
      animation: fade .16s ease-out;
    }
    .top {
      display: flex; align-items: center; gap: 16px;
      width: 100%; max-width: 1400px; margin: 0 auto; padding: 22px 32px 10px;
    }
    .search {
      flex: 1; max-width: 420px; height: 38px; padding: 0 14px;
      border-radius: 10px; border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.07); color: inherit; font: inherit; font-size: 14px; outline: none;
    }
    .search:focus { border-color: #ffb020; box-shadow: 0 0 0 3px rgba(255,176,32,.28); }
    .search::placeholder { color: rgba(238,240,244,.45); }
    .hint { margin-left: auto; color: rgba(238,240,244,.5); font-size: 12px; white-space: nowrap; }
    kbd {
      display: inline-block; min-width: 20px; padding: 1px 6px; margin: 0 1px; text-align: center;
      border-radius: 5px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06);
      font: 11px/1.5 inherit; color: rgba(238,240,244,.75);
    }
    .scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px 32px 40px; }
    .win { max-width: 1400px; margin: 0 auto 26px; }
    .win h2 {
      margin: 14px 2px 12px; font-size: 12px; font-weight: 600; letter-spacing: .04em;
      text-transform: uppercase; color: rgba(238,240,244,.55);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 18px; }
    .card {
      position: relative; display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
      border: 1px solid rgba(255,255,255,.08); border-radius: 12px; background: rgba(255,255,255,.05);
      transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
      animation: pop .2s ease-out both;
    }
    .card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.18); }
    .card.sel { border-color: #ffb020; box-shadow: 0 0 0 2px #ffb020, 0 10px 30px rgba(0,0,0,.35); }
    .thumb { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: #1c1f27; }
    .shot { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .ph {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px; padding: 0 12px;
    }
    .ph img { width: 32px; height: 32px; }
    .ph span {
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 12px; color: rgba(255,255,255,.72);
    }
    .meta { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 9px 10px 10px; }
    .fav { flex: none; width: 16px; height: 16px; }
    .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
    .badge {
      flex: none; padding: 1px 6px; border-radius: 6px; font-size: 10.5px;
      background: rgba(255,255,255,.1); color: rgba(238,240,244,.75);
    }
    .badge.now { background: rgba(255,176,32,.2); color: #ffd27a; }
    .x {
      position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%;
      display: grid; place-items: center; background: rgba(0,0,0,.62); color: #fff;
      font-size: 15px; line-height: 1; opacity: 0; transition: opacity .12s ease, background .12s ease;
    }
    .card:hover .x, .card.sel .x { opacity: 1; }
    .x:hover { background: #e5484d; }
    .empty { padding: 60px 0; text-align: center; color: rgba(238,240,244,.5); }
    [hidden] { display: none !important; }
    @keyframes fade { from { opacity: 0; } }
    @keyframes pop { from { opacity: 0; transform: scale(.96); } }
    @media (prefers-reduced-motion: reduce) {
      .backdrop, .card { animation: none; }
      .card, .x { transition: none; }
      .card:hover { transform: none; }
    }
    @media (max-width: 640px) {
      .top { padding: 16px 16px 8px; }
      .hint { display: none; }
      .scroll { padding: 8px 16px 32px; }
      .grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    }
  `;

  const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };
  const favicon = (url) =>
    chrome.runtime.getURL('/_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');

  function hue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  async function toggleOverview() {
    if (overview) { closeOverview(); return; }
    const token = {};
    overview = token;
    const data = await send({ type: 'getTabs' });
    if (overview !== token || dead) return;      // closed while loading
    if (!data || !data.windows) { overview = null; return; }
    overview = buildOverview(data);
  }

  function closeOverview() {
    if (!overview) return;
    if (overview.cleanup) overview.cleanup();
    if (overview.host) overview.host.remove();
    overview = null;
  }

  function buildOverview(data) {
    const host = document.createElement('hot-corners-overview');
    host.setAttribute('style', 'all:initial;position:fixed;inset:0;z-index:2147483647;');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="backdrop">
        <div class="top">
          <input class="search" type="text" placeholder="Sekmelerde ara…" spellcheck="false" autocomplete="off">
          <div class="hint"><kbd>←</kbd><kbd>→</kbd> seç &nbsp; <kbd>Enter</kbd> aç &nbsp; <kbd>Esc</kbd> kapat</div>
        </div>
        <div class="scroll"></div>
      </div>`;
    const search = root.querySelector('.search');
    const scroll = root.querySelector('.scroll');
    const empty = el('div', 'empty', 'Eşleşen sekme yok');
    empty.hidden = true;

    let cards = [];
    let sel = null;
    const multi = data.windows.length > 1;

    data.windows.forEach((win, wi) => {
      const section = el('section', 'win');
      const h2 = el('h2');
      section.append(h2);
      const grid = el('div', 'grid');
      section.append(grid);
      section._label = multi ? (wi === 0 ? 'Bu pencere' : `Pencere ${wi + 1}`) : '';
      section._h2 = h2;

      for (const t of win.tabs) {
        const card = el('div', 'card');
        card.dataset.id = t.id;
        card.dataset.win = t.windowId;
        card._q = (t.title + ' ' + t.url).toLocaleLowerCase();
        card.style.animationDelay = Math.min(cards.length * 12, 240) + 'ms';

        const thumb = el('div', 'thumb');
        const domain = hostOf(t.url);
        const ph = el('div', 'ph');
        const h = hue(domain || t.title);
        ph.style.background = `linear-gradient(135deg, hsl(${h} 42% 30%), hsl(${(h + 40) % 360} 42% 17%))`;
        const big = el('img');
        big.alt = '';
        big.src = favicon(t.url);
        big.onerror = () => big.remove();
        ph.append(big, el('span', '', domain || t.title));
        thumb.append(ph);
        if (t.thumb) {
          const shot = el('img', 'shot');
          shot.alt = '';
          shot.src = t.thumb;
          shot.onload = () => ph.remove();
          shot.onerror = () => shot.remove();
          thumb.append(shot);
        }

        const meta = el('div', 'meta');
        const fav = el('img', 'fav');
        fav.alt = '';
        fav.src = favicon(t.url);
        fav.onerror = () => { fav.style.visibility = 'hidden'; };
        meta.append(fav, el('span', 'title', t.title || 'Adsız sekme'));
        if (t.id === data.currentTabId) meta.append(el('span', 'badge now', 'Şu anki'));
        else if (t.audible && !t.muted) meta.append(el('span', 'badge', 'Ses'));
        else if (t.muted) meta.append(el('span', 'badge', 'Sessiz'));
        else if (t.pinned) meta.append(el('span', 'badge', 'Sabit'));

        const x = el('div', 'x', '×');
        x.title = 'Sekmeyi kapat';

        card.append(thumb, meta, x);
        grid.append(card);
        cards.push(card);
      }
      scroll.append(section);
    });
    scroll.append(empty);

    const sections = [...scroll.querySelectorAll('.win')];
    function updateHeaders() {
      for (const s of sections) {
        const n = [...s.querySelectorAll('.card')].filter((c) => !c.hidden).length;
        s.hidden = n === 0;
        s._h2.textContent = (s._label ? s._label + ' · ' : '') + `${n} sekme`;
      }
    }
    updateHeaders();

    const visible = () => cards.filter((c) => !c.hidden);

    function select(card, reveal = true) {
      if (sel === card) return;
      if (sel) sel.classList.remove('sel');
      sel = card || null;
      if (sel) {
        sel.classList.add('sel');
        if (reveal) sel.scrollIntoView({ block: 'nearest' });
      }
    }

    function move(dir) {
      const vis = visible();
      if (!vis.length) return;
      if (!sel || sel.hidden) { select(vis[0]); return; }
      const i = vis.indexOf(sel);
      if (dir === 'left') return select(vis[Math.max(0, i - 1)]);
      if (dir === 'right') return select(vis[Math.min(vis.length - 1, i + 1)]);
      const cur = sel.getBoundingClientRect();
      const cx = cur.left + cur.width / 2;
      const down = dir === 'down';
      let rowTop = null;
      let best = null;
      let bestDx = Infinity;
      for (const c of vis) {
        const r = c.getBoundingClientRect();
        const ok = down ? r.top > cur.top + 5 : r.top < cur.top - 5;
        if (!ok) continue;
        if (rowTop === null || (down ? r.top < rowTop - 5 : r.top > rowTop + 5)) {
          rowTop = r.top; best = null; bestDx = Infinity;
        }
        if (Math.abs(r.top - rowTop) <= 5) {
          const dx = Math.abs(r.left + r.width / 2 - cx);
          if (dx < bestDx) { bestDx = dx; best = c; }
        }
      }
      if (best) select(best);
    }

    function filter() {
      const q = search.value.trim().toLocaleLowerCase();
      for (const c of cards) c.hidden = !!q && !c._q.includes(q);
      updateHeaders();
      const vis = visible();
      empty.hidden = vis.length > 0;
      if (!sel || sel.hidden) select(vis[0] || null);
    }

    function activate(card) {
      const id = Number(card.dataset.id);
      closeOverview();
      if (id !== data.currentTabId) {
        send({ type: 'activateTab', tabId: id, windowId: Number(card.dataset.win) });
      }
    }

    function closeTab(card) {
      const id = Number(card.dataset.id);
      send({ type: 'closeTabById', tabId: id });
      if (id === data.currentTabId) { closeOverview(); return; }
      const vis = visible();
      const i = vis.indexOf(card);
      const next = vis[i + 1] || vis[i - 1] || null;
      card.remove();
      cards = cards.filter((c) => c !== card);
      if (sel === card) { sel = null; select(next, false); }
      updateHeaders();
      empty.hidden = visible().length > 0;
    }

    // Keep keyboard focus in the search box.
    root.addEventListener('mousedown', (e) => { if (e.target !== search) e.preventDefault(); });

    root.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card && e.target.closest('.x')) closeTab(card);
      else if (card) activate(card);
      else if (!e.target.closest('.top')) closeOverview();
    });

    root.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.card');
      if (card) select(card, false);
    });

    search.addEventListener('input', filter);

    // Keys are caught on window in the capture phase so the page's own
    // shortcuts never see them. Stopping propagation doesn't cancel the
    // default action, so typing still lands in the search box.
    const swallow = (e) => e.stopImmediatePropagation();
    const onKey = (e) => {
      e.stopImmediatePropagation();
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (search.value) { search.value = ''; filter(); } else closeOverview();
          break;
        case 'Enter':
          e.preventDefault();
          if (sel && !sel.hidden) activate(sel);
          break;
        case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
          // While there's search text, ←/→ move the caret; Tab still moves the selection.
          if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && search.value) break;
          e.preventDefault();
          move(e.key.slice(5).toLowerCase());
          break;
        case 'Tab':
          e.preventDefault();
          move(e.shiftKey ? 'left' : 'right');
          break;
        default:
          // Typing anywhere goes to the search box.
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && root.activeElement !== search) {
            search.focus({ preventScroll: true });
          }
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', swallow, true);
    window.addEventListener('keypress', swallow, true);
    const cleanup = () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', swallow, true);
      window.removeEventListener('keypress', swallow, true);
    };

    document.documentElement.appendChild(host);
    const current = cards.find((c) => Number(c.dataset.id) === data.currentTabId);
    select(current || cards[0], true);
    requestAnimationFrame(() => search.focus({ preventScroll: true }));

    return { host, cleanup };
  }

  // ---------- small status pill (e.g. after the on/off shortcut) ----------

  let noticeHost = null;
  let noticeTimer = 0;

  function notice(text) {
    if (!noticeHost) {
      noticeHost = document.createElement('hot-corners-notice');
      noticeHost.setAttribute('style', 'all:initial;position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;');
      const root = noticeHost.attachShadow({ mode: 'closed' });
      root.innerHTML = `
        <style>
          .pill {
            display: flex; align-items: center; gap: 9px; padding: 9px 16px 9px 12px;
            border-radius: 999px; background: rgba(20, 21, 26, .9); color: #f3f4f7;
            -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, .1); box-shadow: 0 8px 28px rgba(0, 0, 0, .3);
            font: 600 13px/1.2 "Segoe UI", system-ui, -apple-system, sans-serif; white-space: nowrap;
            opacity: 0; transform: translateY(-8px); transition: opacity .18s ease, transform .18s ease;
          }
          .pill.show { opacity: 1; transform: none; }
          .dot { width: 9px; height: 9px; border-radius: 50%; background: #ffb020; box-shadow: 0 0 10px #ffb020; }
          .pill.off .dot { background: #8a8f9b; box-shadow: none; }
          @media (prefers-reduced-motion: reduce) { .pill { transition: none; } }
        </style>
        <div class="pill" role="status"><span class="dot"></span><span class="text"></span></div>`;
      noticeHost._pill = root.querySelector('.pill');
      noticeHost._text = root.querySelector('.text');
    }
    const pill = noticeHost._pill;
    noticeHost._text.textContent = text;
    pill.classList.toggle('off', /kapat|duraklat/i.test(text));
    if (!noticeHost.isConnected) document.documentElement.appendChild(noticeHost);
    requestAnimationFrame(() => pill.classList.add('show'));
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      pill.classList.remove('show');
      setTimeout(() => { if (!pill.classList.contains('show')) noticeHost.remove(); }, 250);
    }, 1800);
  }

  // ---------- wiring ----------

  const onBlur = () => reset();
  const onVisibility = () => reset();

  // The keyboard shortcut (chrome://extensions/shortcuts) arrives from the background.
  const onMessage = (msg) => {
    if (!msg) return;
    if (msg.type === 'toggleOverview') toggleOverview();
    else if (msg.type === 'notice') notice(msg.text);
  };

  window.addEventListener('mousemove', onMove, { capture: true, passive: true });
  window.addEventListener('keydown', onKeyState, { capture: true, passive: true });
  window.addEventListener('keyup', onKeyState, { capture: true, passive: true });
  document.addEventListener('mouseout', onOut, true);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(SHUTDOWN, shutdown, { once: true });
  chrome.runtime.onMessage.addListener(onMessage);

  function shutdown() {
    if (dead) return;
    dead = true;
    clearTimeout(timer);
    window.removeEventListener('mousemove', onMove, { capture: true });
    window.removeEventListener('keydown', onKeyState, { capture: true });
    window.removeEventListener('keyup', onKeyState, { capture: true });
    document.removeEventListener('mouseout', onOut, true);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    try {
      chrome.storage.onChanged.removeListener(onStorage);
      chrome.runtime.onMessage.removeListener(onMessage);
    } catch { /* context gone */ }
    closeOverview();
  }
})();
