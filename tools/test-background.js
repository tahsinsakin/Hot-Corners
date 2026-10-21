const fs = require('fs');
const dir = require('path').join(__dirname, '..', 'extension') + '/';
const areas = { sync: {}, local: {}, session: {} };
const changeFns = [];
const mkArea = (name) => ({
  get: async (k) => { if (k == null) return { ...areas[name] }; const keys = Array.isArray(k) ? k : [k]; const o = {}; for (const x of keys) if (x in areas[name]) o[x] = areas[name][x]; return o; },
  set: async (o) => { const ch = {}; for (const [k, v] of Object.entries(o)) { ch[k] = { newValue: v }; areas[name][k] = v; } changeFns.forEach((f) => f(ch, name)); },
  remove: async (k) => { delete areas[name][k]; },
});
const badge = { global: '', tabs: {} }; let icon = null; const alarms = {}; const notices = []; const menu = {};
const listeners = {};
const ev = (n) => ({ addListener: (f) => { (listeners[n] ||= []).push(f); } });
global.importScripts = (f) => eval.call(global, fs.readFileSync(dir + f, 'utf8'));
global.chrome = {
  storage: { sync: mkArea('sync'), local: mkArea('local'), session: mkArea('session'), onChanged: { addListener: (f) => changeFns.push(f) } },
  runtime: { onInstalled: ev('installed'), onStartup: ev('startup'), onMessage: ev('message'), getURL: (p) => p, lastError: null },
  tabs: { query: async () => [{ id: 1, url: 'https://youtube.com/watch', active: true }, { id: 2, url: 'https://github.com/' }],
    onActivated: ev('a'), onUpdated: ev('u'), onRemoved: ev('r'), sendMessage: async (id, m) => { notices.push(m.text); }, create() {} },
  action: { setIcon: async ({ path }) => { icon = path[16]; }, setBadgeText: async ({ tabId, text }) => { if (tabId) badge.tabs[tabId] = text; else badge.global = text; },
    setBadgeBackgroundColor: async () => {}, setBadgeTextColor: async () => {} },
  alarms: { clear: async (n) => { delete alarms[n]; }, create: (n, o) => { alarms[n] = o.when; }, onAlarm: ev('alarm') },
  contextMenus: { removeAll: (cb) => cb(), create: (o) => { menu[o.id] = o.title; }, update: (id, p, cb) => { Object.assign(menu, p.title ? { [id]: p.title } : {}); cb && cb(); }, onClicked: ev('menu') },
  commands: { onCommand: ev('cmd') }, scripting: { executeScript: async () => {} }, sessions: {}, windows: {},
};
eval.call(global, fs.readFileSync(dir + 'background.js', 'utf8'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const R = [];
  for (const f of listeners.installed) await f({ reason: 'install' }); await wait(30);
  R.push(['defaults saved, badge empty, colour icon', areas.sync.settings.enabled === true && badge.global === '' && icon.includes('icon16')]);
  listeners.cmd[0]('toggle-enabled'); await wait(50);
  R.push(['shortcut turns off: OFF badge, grey icon, notice', areas.sync.settings.enabled === false && badge.global === 'OFF' && badge.tabs[1] === 'OFF' && icon.includes('off16') && notices.at(-1) === 'Hot Corners is off']);
  R.push(['menu offers "Turn on"', menu.toggle === 'Turn on']);
  listeners.cmd[0]('toggle-enabled'); await wait(50);
  R.push(['shortcut turns back on', areas.sync.settings.enabled === true && badge.global === '' && notices.at(-1) === 'Hot Corners is on']);
  await listeners.menu[0]({ menuItemId: 'pause15' }); await wait(50);
  const until = areas.local.pausedUntil;
  R.push(['pause 15 min: II badge + alarm ~15 min', badge.global === 'II' && Math.abs(until - Date.now() - 900000) < 2000 && alarms.unpause === until]);
  listeners.cmd[0]('toggle-enabled'); await wait(50);
  R.push(['shortcut while paused resumes (not turns off)', areas.sync.settings.enabled === true && areas.local.pausedUntil === 0 && badge.global === '' && !alarms.unpause]);
  await listeners.menu[0]({ menuItemId: 'site' }, { url: 'https://youtube.com/watch' }); await wait(50);
  R.push(['site off: dash badge only on that tab', badge.tabs[1] === '–' && badge.tabs[2] === '' && notices.at(-1) === 'Off for youtube.com']);
  await listeners.menu[0]({ menuItemId: 'pauseRestart' }); await wait(30);
  for (const f of listeners.startup) await f(); await wait(50);
  R.push(['"until restart" pause ends on Chrome start', areas.local.pausedUntil === 0 && badge.global === '']);
  await listeners.menu[0]({ menuItemId: 'pause60' }); await wait(30);
  listeners.alarm[0]({ name: 'unpause' }); await wait(50);
  R.push(['alarm ends a timed pause', areas.local.pausedUntil === 0]);
  for (const [n, ok] of R) console.log(ok ? 'PASS' : 'FAIL', n);
})();
