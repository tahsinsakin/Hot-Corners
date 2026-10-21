importScripts('shared.js');

const session = chrome.storage.session;

// ---------- install / update ----------

chrome.runtime.onInstalled.addListener(async (details) => {
  const { settings } = await chrome.storage.sync.get('settings');
  await chrome.storage.sync.set({ settings: HC.merge(settings) });

  // Tabs that were already open don't get the content script automatically.
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file:///*'] });
  for (const t of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: t.id }, files: ['shared.js', 'content.js'] })
      .catch(() => {});
  }

  buildMenu();
  refreshState();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#welcome') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  // "Until Chrome restarts" ends here.
  if ((await HC.loadPause()) === HC.PAUSE_UNTIL_RESTART) await setPause(0);
  refreshState();
});

// ---------- on / off, pause, toolbar icon state ----------

const ICONS_ON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png' };
const ICONS_OFF = { 16: 'icons/off16.png', 32: 'icons/off32.png', 48: 'icons/off48.png' };

async function setEnabled(on) {
  const settings = await HC.load();
  settings.enabled = on;
  await HC.save(settings);
  if (on) await setPause(0); // turning on also ends a pause
}

async function setPause(minutesOrFlag) {
  await chrome.alarms.clear('unpause');
  let until = 0;
  if (minutesOrFlag === HC.PAUSE_UNTIL_RESTART) until = HC.PAUSE_UNTIL_RESTART;
  else if (minutesOrFlag > 0) {
    until = Date.now() + minutesOrFlag * 60000;
    chrome.alarms.create('unpause', { when: until });
  }
  await chrome.storage.local.set({ pausedUntil: until });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'unpause') setPause(0);
});

function hostOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname : '';
  } catch {
    return '';
  }
}

// Badge: OFF (turned off) · II (paused) · – (off on this site) · nothing (working).
async function refreshState() {
  const [settings, pausedUntil] = await Promise.all([HC.load(), HC.loadPause()]);
  const paused = HC.isPaused(pausedUntil);
  const globalText = !settings.enabled ? 'OFF' : paused ? 'II' : '';

  await chrome.action.setIcon({ path: settings.enabled && !paused ? ICONS_ON : ICONS_OFF });
  await chrome.action.setBadgeBackgroundColor({ color: !settings.enabled ? '#5b606c' : '#ffb020' });
  if (chrome.action.setBadgeTextColor) {
    await chrome.action.setBadgeTextColor({ color: !settings.enabled ? '#ffffff' : '#1d1400' });
  }
  await chrome.action.setBadgeText({ text: globalText });

  // Per-tab text wins over the global one, so set it for every tab.
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    const siteOff = settings.disabledSites.includes(hostOf(t.url || ''));
    const text = globalText || (siteOff ? '–' : '');
    chrome.action.setBadgeText({ tabId: t.id, text }).catch(() => {});
  }

  updateMenu(settings, pausedUntil);
}

async function refreshTab(tabId, url) {
  const [settings, pausedUntil] = await Promise.all([HC.load(), HC.loadPause()]);
  const globalText = !settings.enabled ? 'OFF' : HC.isPaused(pausedUntil) ? 'II' : '';
  const siteOff = settings.disabledSites.includes(hostOf(url || ''));
  chrome.action.setBadgeText({ tabId, text: globalText || (siteOff ? '–' : '') }).catch(() => {});
}

chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === 'sync' && changes.settings) || (area === 'local' && changes.pausedUntil)) refreshState();
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url || info.status === 'loading') refreshTab(tabId, tab.url);
});

// Short message in the page the user is looking at.
async function notifyActiveTab(text) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) chrome.tabs.sendMessage(tab.id, { type: 'notice', text }).catch(() => {});
}

async function toggleEnabled() {
  const [settings, pausedUntil] = await Promise.all([HC.load(), HC.loadPause()]);
  const working = settings.enabled && !HC.isPaused(pausedUntil);
  await setEnabled(!working);
  notifyActiveTab(working ? 'Hot Corners kapatıldı' : 'Hot Corners açıldı');
}

async function toggleSite(tab) {
  const host = hostOf(tab.url || '');
  if (!host) return;
  const settings = await HC.load();
  const off = settings.disabledSites.includes(host);
  settings.disabledSites = off
    ? settings.disabledSites.filter((h) => h !== host)
    : [...settings.disabledSites, host].sort();
  await HC.save(settings);
  notifyActiveTab(off ? host + ' için açıldı' : host + ' için kapatıldı');
}

// ---------- right-click menu on the toolbar icon ----------

function buildMenu() {
  chrome.contextMenus.removeAll(() => {
    const add = (id, title) => chrome.contextMenus.create({ id, title, contexts: ['action'] });
    add('toggle', 'Kapat');
    add('pause15', '15 dakika duraklat');
    add('pause60', '1 saat duraklat');
    add('pauseRestart', 'Chrome yeniden başlayana kadar duraklat');
    add('site', 'Bu sitede aç / kapat');
  });
}

function updateMenu(settings, pausedUntil) {
  const paused = HC.isPaused(pausedUntil);
  const working = settings.enabled && !paused;
  const set = (id, props) => chrome.contextMenus.update(id, props, () => void chrome.runtime.lastError);
  set('toggle', { title: working ? 'Kapat' : paused && settings.enabled ? 'Duraklatmayı bitir' : 'Aç' });
  for (const id of ['pause15', 'pause60', 'pauseRestart']) set(id, { enabled: working });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'toggle': return toggleEnabled();
    case 'pause15': await setPause(15); return notifyActiveTab('15 dakika duraklatıldı');
    case 'pause60': await setPause(60); return notifyActiveTab('1 saat duraklatıldı');
    case 'pauseRestart':
      await setPause(HC.PAUSE_UNTIL_RESTART);
      return notifyActiveTab('Chrome yeniden başlayana kadar duraklatıldı');
    case 'site': return tab && toggleSite(tab);
  }
});

// ---------- most-recently-used tabs (per window) ----------

async function trackMru(windowId, tabId) {
  const { mru = {} } = await session.get('mru');
  const list = (mru[windowId] || []).filter((id) => id !== tabId);
  list.unshift(tabId);
  mru[windowId] = list.slice(0, 50);
  await session.set({ mru });
}

async function forgetTab(tabId) {
  const { mru = {} } = await session.get('mru');
  for (const w of Object.keys(mru)) mru[w] = mru[w].filter((id) => id !== tabId);
  await session.set({ mru });
  await session.remove('thumb_' + tabId);
}

// ---------- thumbnails for the tab overview ----------

let lastCapture = 0;

async function capture(windowId, tabId) {
  // captureVisibleTab is rate-limited by Chrome (~2 calls/sec).
  const now = Date.now();
  if (now - lastCapture < 550) return;
  lastCapture = now;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active || tab.windowId !== windowId) return;
    const shot = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 70 });
    const thumb = await shrink(shot, 480);
    await session.set({ ['thumb_' + tabId]: thumb });
  } catch {
    // chrome:// pages, minimized windows etc. can't be captured.
  }
}

async function shrink(dataUrl, width) {
  const blob = await (await fetch(dataUrl)).blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, width / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.72 });
  const bytes = new Uint8Array(await out.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return 'data:image/jpeg;base64,' + btoa(bin);
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  trackMru(windowId, tabId);
  setTimeout(() => capture(windowId, tabId), 450);
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.active) {
    setTimeout(() => capture(tab.windowId, tabId), 300);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTab(tabId);
});

// ---------- actions ----------

function normalizeUrl(url) {
  const u = (url || '').trim();
  if (!u) return undefined;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u;
}

async function focusTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  if (windowId != null) await chrome.windows.update(windowId, { focused: true });
}

async function stepTab(tab, delta) {
  const tabs = await chrome.tabs.query({ windowId: tab.windowId });
  tabs.sort((a, b) => a.index - b.index);
  const i = tabs.findIndex((t) => t.id === tab.id);
  const next = tabs[(i + delta + tabs.length) % tabs.length];
  if (next) await chrome.tabs.update(next.id, { active: true });
}

async function lastTab(tab) {
  const { mru = {} } = await session.get('mru');
  for (const id of mru[tab.windowId] || []) {
    if (id === tab.id) continue;
    try {
      const t = await chrome.tabs.get(id);
      if (t.windowId === tab.windowId) {
        await chrome.tabs.update(id, { active: true });
        return;
      }
    } catch {
      // tab no longer exists
    }
  }
  await stepTab(tab, -1);
}

async function toggleFullscreen(windowId) {
  const win = await chrome.windows.get(windowId);
  const key = 'prevState_' + windowId;
  if (win.state === 'fullscreen') {
    const stored = await session.get(key);
    await chrome.windows.update(windowId, { state: stored[key] || 'maximized' });
  } else {
    await session.set({ [key]: win.state });
    await chrome.windows.update(windowId, { state: 'fullscreen' });
  }
}

async function runAction(action, tab, url) {
  switch (action) {
    case 'newTab': return chrome.tabs.create({ windowId: tab.windowId, index: tab.index + 1 });
    case 'closeTab': return chrome.tabs.remove(tab.id);
    case 'reopenClosed': return chrome.sessions.restore();
    case 'nextTab': return stepTab(tab, 1);
    case 'prevTab': return stepTab(tab, -1);
    case 'lastTab': return lastTab(tab);
    case 'reload': return chrome.tabs.reload(tab.id);
    case 'duplicateTab': return chrome.tabs.duplicate(tab.id);
    case 'pinTab': return chrome.tabs.update(tab.id, { pinned: !tab.pinned });
    case 'muteTab': return chrome.tabs.update(tab.id, { muted: !(tab.mutedInfo && tab.mutedInfo.muted) });
    case 'newWindow': return chrome.windows.create({});
    case 'minimizeWindow': return chrome.windows.update(tab.windowId, { state: 'minimized' });
    case 'toggleFullscreen': return toggleFullscreen(tab.windowId);
    case 'openUrl': return chrome.tabs.create({ url: normalizeUrl(url), windowId: tab.windowId, index: tab.index + 1 });
  }
}

async function getTabs(senderTab) {
  // Fresh shot of the current page before the overlay covers it.
  if (senderTab) await capture(senderTab.windowId, senderTab.id);

  const wins = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  if (senderTab) {
    wins.sort((a, b) => (b.id === senderTab.windowId) - (a.id === senderTab.windowId));
  }
  const keys = wins.flatMap((w) => w.tabs.map((t) => 'thumb_' + t.id));
  const thumbs = keys.length ? await session.get(keys) : {};

  return {
    currentTabId: senderTab ? senderTab.id : null,
    windows: wins.map((w) => ({
      id: w.id,
      tabs: w.tabs.map((t) => ({
        id: t.id,
        windowId: t.windowId,
        title: t.title || t.url || '',
        url: t.url || '',
        active: t.active,
        pinned: t.pinned,
        audible: !!t.audible,
        muted: !!(t.mutedInfo && t.mutedInfo.muted),
        thumb: thumbs['thumb_' + t.id] || null,
      })),
    })),
  };
}

async function handle(msg, sender) {
  const tab = sender.tab;
  switch (msg && msg.type) {
    case 'action': return tab ? runAction(msg.action, tab, msg.url) : null;
    case 'getTabs': return getTabs(tab);
    case 'activateTab': return focusTab(msg.tabId, msg.windowId);
    case 'closeTabById': return chrome.tabs.remove(msg.tabId);
    case 'pause': return setPause(msg.minutes);
    case 'setEnabled': return setEnabled(!!msg.on);
  }
  return null;
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-overview' && tab && tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggleOverview' }).catch(() => {});
  } else if (command === 'toggle-enabled') {
    toggleEnabled();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(
    (res) => sendResponse(res === undefined ? null : res),
    (err) => sendResponse({ error: String(err) })
  );
  return true;
});
