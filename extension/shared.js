// Shared by the service worker, content script and settings page.
// Assigned to globalThis (not const) so a second injection doesn't throw.
globalThis.HC = {
  ACTIONS: [
    { group: 'Genel', items: [
      ['none', 'Hiçbir şey'],
      ['tabOverview', 'Sekme görünümü (Mission Control)'],
    ] },
    { group: 'Sekmeler', items: [
      ['lastTab', 'Son kullanılan sekmeye geç'],
      ['nextTab', 'Sonraki sekme'],
      ['prevTab', 'Önceki sekme'],
      ['newTab', 'Yeni sekme'],
      ['closeTab', 'Sekmeyi kapat'],
      ['reopenClosed', 'Kapatılan sekmeyi geri aç'],
      ['duplicateTab', 'Sekmeyi çoğalt'],
      ['pinTab', 'Sekmeyi sabitle / çöz'],
      ['muteTab', 'Sesi kapat / aç'],
    ] },
    { group: 'Sayfa', items: [
      ['goBack', 'Geri'],
      ['goForward', 'İleri'],
      ['reload', 'Yenile'],
      ['scrollTop', 'En üste kaydır'],
      ['scrollBottom', 'En alta kaydır'],
    ] },
    { group: 'Pencere', items: [
      ['newWindow', 'Yeni pencere'],
      ['minimizeWindow', 'Pencereyi küçült'],
      ['toggleFullscreen', 'Tam ekran aç / kapat'],
    ] },
    { group: 'Özel', items: [
      ['openUrl', 'Adres aç…'],
    ] },
  ],

  // Key that must be held for a corner to fire, like macOS's modifier option.
  MODIFIERS: [
    ['none', 'Tuş yok'],
    ['shift', 'Shift basılıyken'],
    ['ctrl', 'Ctrl basılıyken'],
    ['alt', 'Alt basılıyken'],
  ],

  CORNER_NAMES: { tl: 'Sol üst', tr: 'Sağ üst', bl: 'Sol alt', br: 'Sağ alt' },

  DEFAULTS: {
    enabled: true,
    delay: 250,             // ms the cursor must rest in a corner
    size: 6,                // px size of each corner zone
    feedback: true,         // glow in the corner when triggered
    ignoreFullscreen: true, // don't fire while a page (e.g. a video) is fullscreen
    disabledSites: [],
    corners: {
      tl: { action: 'tabOverview', url: '', modifier: 'none' },
      tr: { action: 'none', url: '', modifier: 'none' },
      bl: { action: 'none', url: '', modifier: 'none' },
      br: { action: 'lastTab', url: '', modifier: 'none' },
    },
  },

  actionLabel(id) {
    for (const g of globalThis.HC.ACTIONS) {
      for (const [v, label] of g.items) if (v === id) return label;
    }
    return id;
  },

  merge(stored) {
    const d = globalThis.HC.DEFAULTS;
    const s = stored && typeof stored === 'object' ? stored : {};
    const c = s.corners || {};
    const corner = (k) => ({ ...d.corners[k], ...(c[k] || {}) });
    const num = (v, def, min, max) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
    return {
      ...d,
      ...s,
      enabled: s.enabled !== false,
      delay: num(s.delay, d.delay, 0, 2000),
      size: num(s.size, d.size, 1, 60),
      feedback: s.feedback !== false,
      ignoreFullscreen: s.ignoreFullscreen !== false,
      disabledSites: Array.isArray(s.disabledSites) ? s.disabledSites.filter((x) => typeof x === 'string') : [],
      corners: { tl: corner('tl'), tr: corner('tr'), bl: corner('bl'), br: corner('br') },
    };
  },

  async load() {
    const { settings } = await chrome.storage.sync.get('settings');
    return globalThis.HC.merge(settings);
  },

  save(settings) {
    return chrome.storage.sync.set({ settings });
  },

  // ---------- pause ----------
  // Kept in storage.local (per device, not synced). 0 = not paused,
  // -1 = until Chrome restarts, otherwise a timestamp in ms.
  PAUSE_UNTIL_RESTART: -1,

  isPaused(until) {
    return until === -1 || (typeof until === 'number' && until > Date.now());
  },

  async loadPause() {
    const { pausedUntil = 0 } = await chrome.storage.local.get('pausedUntil');
    return pausedUntil;
  },

  pauseLabel(until) {
    if (until === -1) return 'Chrome yeniden başlayana kadar duraklatıldı';
    const t = new Date(until).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return 'Duraklatıldı · bitiş ' + t;
  },
};
