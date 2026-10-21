// Shared by the service worker, content script and settings page.
// Assigned to globalThis (not const) so a second injection doesn't throw.
globalThis.HC = {
  ACTIONS: [
    { group: 'General', items: [
      ['none', 'Do nothing'],
      ['tabOverview', 'Tab overview'],
    ] },
    { group: 'Tabs', items: [
      ['lastTab', 'Last used tab'],
      ['nextTab', 'Next tab'],
      ['prevTab', 'Previous tab'],
      ['newTab', 'New tab'],
      ['closeTab', 'Close tab'],
      ['reopenClosed', 'Reopen closed tab'],
      ['duplicateTab', 'Duplicate tab'],
      ['pinTab', 'Pin / unpin tab'],
      ['muteTab', 'Mute / unmute tab'],
    ] },
    { group: 'Page', items: [
      ['goBack', 'Back'],
      ['goForward', 'Forward'],
      ['reload', 'Reload'],
      ['scrollTop', 'Scroll to top'],
      ['scrollBottom', 'Scroll to bottom'],
    ] },
    { group: 'Window', items: [
      ['newWindow', 'New window'],
      ['minimizeWindow', 'Minimize window'],
      ['toggleFullscreen', 'Toggle full screen'],
    ] },
    { group: 'Custom', items: [
      ['openUrl', 'Open a web address…'],
    ] },
  ],

  // Key that must be held for a corner to fire.
  MODIFIERS: [
    ['none', 'No key needed'],
    ['shift', 'While holding Shift'],
    ['ctrl', 'While holding Ctrl'],
    ['alt', 'While holding Alt'],
  ],

  CORNER_NAMES: { tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' },

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
    if (until === -1) return 'Paused until Chrome restarts';
    const t = new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return 'Paused until ' + t;
  },
};
