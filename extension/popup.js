(async () => {
  const $ = (s) => document.querySelector(s);
  const store = await UI.createStore();
  let pausedUntil = await HC.loadPause();

  const status = $('#status');
  const enabled = $('#enabled');
  const pauseRow = $('#pauseRow');
  const pauseButtons = $('#pauseButtons');
  const resume = $('#resume');

  function renderState() {
    const on = store.settings.enabled;
    const paused = on && HC.isPaused(pausedUntil);
    enabled.checked = on;
    status.textContent = !on ? 'Off' : paused ? 'Paused' : 'On';
    document.body.classList.toggle('off', !on || paused);
    document.body.classList.toggle('disabled', !on);

    pauseRow.classList.toggle('paused', paused);
    pauseButtons.hidden = paused;
    resume.hidden = !paused;
    for (const b of pauseButtons.querySelectorAll('button')) b.disabled = !on;
    $('#pauseState').textContent = paused
      ? HC.pauseLabel(pausedUntil)
      : 'Take a break; it comes back on by itself';
  }

  UI.bindSwitch(enabled, store, renderState);

  pauseButtons.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    chrome.runtime.sendMessage({ type: 'pause', minutes: Number(b.dataset.minutes) });
  });
  resume.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'pause', minutes: 0 }));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.pausedUntil) {
      pausedUntil = changes.pausedUntil.newValue || 0;
      renderState();
    }
  });

  const renderCorners = UI.buildCorners($('#screen'), store, { full: false });

  // Per-site switch for the page the popup was opened on.
  let renderSite = () => {};
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab && tab.url ? new URL(tab.url) : null;
    if (url && /^https?:$/.test(url.protocol) && url.hostname) {
      const host = url.hostname;
      const siteOn = $('#siteOn');
      $('#siteHost').textContent = host;
      renderSite = () => {
        const on = !store.settings.disabledSites.includes(host);
        siteOn.checked = on;
        $('#siteState').textContent = on ? 'Working on this site' : 'Off on this site';
      };
      siteOn.addEventListener('change', () => {
        const list = store.settings.disabledSites.filter((h) => h !== host);
        if (!siteOn.checked) list.push(host);
        store.settings.disabledSites = list.sort();
        store.save();
        renderSite();
      });
      renderSite();
      $('#siteRow').hidden = false;
    }
  } catch {
    // tab URL not available
  }

  UI.keysInto($('#keyToggle'), await UI.shortcutText('toggle-enabled'));
  UI.keysInto($('#keyOverview'), await UI.shortcutText('open-overview'));

  $('#more').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  renderState();
  store.onExternalChange(() => { renderState(); renderCorners(); renderSite(); });
})();
