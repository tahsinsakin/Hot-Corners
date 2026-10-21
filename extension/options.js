(async () => {
  const $ = (s) => document.querySelector(s);
  const store = await UI.createStore();

  // ---------- master switch ----------
  const enabled = $('#enabled');
  let pausedUntil = await HC.loadPause();
  const renderEnabled = () => {
    const on = store.settings.enabled;
    const paused = on && HC.isPaused(pausedUntil);
    enabled.checked = on;
    $('#status').textContent = !on ? 'Kapalı' : paused ? HC.pauseLabel(pausedUntil) : 'Açık';
    $('#resume').hidden = !paused;
    document.body.classList.toggle('off', !on || paused);
    document.body.classList.toggle('paused', paused);
  };
  UI.bindSwitch(enabled, store, renderEnabled);
  $('#resume').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'pause', minutes: 0 }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pausedUntil) {
      pausedUntil = changes.pausedUntil.newValue || 0;
      renderEnabled();
    }
  });

  // ---------- first-run welcome ----------
  if (location.hash === '#welcome') {
    $('#welcome').hidden = false;
    $('#welcomeDone').addEventListener('click', () => {
      $('#welcome').hidden = true;
      history.replaceState(null, '', location.pathname);
    });
  }

  // ---------- corners ----------
  const renderCorners = UI.buildCorners($('#screen'), store, { full: true });

  // ---------- behaviour ----------
  const delay = $('#delay');
  const size = $('#size');
  const feedback = $('#feedback');
  const ignoreFs = $('#ignoreFullscreen');

  function renderBehaviour() {
    const s = store.settings;
    delay.value = s.delay;
    size.value = s.size;
    feedback.checked = s.feedback;
    ignoreFs.checked = s.ignoreFullscreen;
    $('#delayOut').textContent = s.delay === 0 ? 'Anında' : s.delay + ' ms';
    $('#sizeOut').textContent = s.size + ' px';
  }

  delay.addEventListener('input', () => {
    store.settings.delay = Number(delay.value);
    renderBehaviour();
    store.save(400);
  });
  size.addEventListener('input', () => {
    store.settings.size = Number(size.value);
    renderBehaviour();
    store.save(400);
  });
  feedback.addEventListener('change', () => { store.settings.feedback = feedback.checked; store.save(); });
  ignoreFs.addEventListener('change', () => { store.settings.ignoreFullscreen = ignoreFs.checked; store.save(); });

  // ---------- shortcut ----------
  async function renderShortcut() {
    const toggle = await UI.shortcutText('toggle-enabled');
    UI.keysInto($('#keyToggle'), toggle);
    UI.keysInto($('#keyOverview'), await UI.shortcutText('open-overview'));
    const w = $('#welcomeToggle');
    if (toggle) UI.keysInto(w, toggle);
    else w.textContent = 'Klavye kısayoluyla';
  }
  $('#changeShortcut').addEventListener('click', UI.openShortcuts);
  // Coming back from chrome://extensions/shortcuts should show the new keys.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderShortcut();
  });

  // ---------- disabled sites ----------
  const input = $('#siteInput');
  const error = $('#siteError');
  const list = $('#sites');

  function toHost(raw) {
    let v = raw.trim().toLowerCase();
    if (!v) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//.test(v)) v = 'https://' + v;
    try {
      const h = new URL(v).hostname;
      return /^[a-z0-9.-]+$/.test(h) && h.includes('.') || h === 'localhost' ? h : null;
    } catch {
      return null;
    }
  }

  function renderSites() {
    const sites = store.settings.disabledSites;
    list.replaceChildren();
    for (const host of sites) {
      const li = document.createElement('li');
      const icon = document.createElement('img');
      icon.alt = '';
      icon.src = chrome.runtime.getURL('/_favicon/?pageUrl=' + encodeURIComponent('https://' + host) + '&size=32');
      icon.onerror = () => { icon.style.visibility = 'hidden'; };
      const name = document.createElement('span');
      name.className = 'host';
      name.textContent = host;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn ghost danger';
      remove.textContent = 'Kaldır';
      remove.setAttribute('aria-label', host + ' sitesini listeden kaldır');
      remove.addEventListener('click', () => {
        store.settings.disabledSites = store.settings.disabledSites.filter((h) => h !== host);
        store.save();
        renderSites();
      });
      li.append(icon, name, remove);
      list.append(li);
    }
    $('#sitesEmpty').hidden = sites.length > 0;
  }

  $('#addSite').addEventListener('submit', (e) => {
    e.preventDefault();
    const host = toHost(input.value);
    if (!host) {
      error.textContent = 'Geçerli bir site adresi yaz, örneğin youtube.com';
      error.hidden = false;
      input.focus();
      return;
    }
    error.hidden = true;
    if (!store.settings.disabledSites.includes(host)) {
      store.settings.disabledSites = [...store.settings.disabledSites, host].sort();
      store.save();
    }
    input.value = '';
    renderSites();
  });
  input.addEventListener('input', () => { error.hidden = true; });

  // ---------- footer ----------
  $('#version').textContent = 'Sürüm ' + chrome.runtime.getManifest().version;
  $('#reset').addEventListener('click', () => {
    if (!confirm('Tüm ayarlar varsayılana dönsün mü? Devre dışı site listesi de temizlenir.')) return;
    store.settings = HC.merge(null);
    store.save();
    renderAll();
  });

  function renderAll() {
    renderEnabled();
    renderCorners();
    renderBehaviour();
    renderSites();
  }

  renderAll();
  renderShortcut();
  store.onExternalChange(renderAll);
})();
