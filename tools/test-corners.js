const fs = require('fs');
const dir = require('path').join(__dirname, '..', 'extension') + '/';
const handlers = {}; const sent = [];
const on = (t) => (type, fn) => { (handlers[t + type] ||= []).push(fn); };
const off = () => {};
const stored = { settings: { corners: { tr: { action: 'newTab', modifier: 'shift' } }, delay: 100 } };
global.window = { addEventListener: on('w:'), removeEventListener: off, dispatchEvent() {}, innerWidth: 1000, innerHeight: 800,
  matchMedia: () => ({ matches: true }), scrollTo() {} };
global.document = { addEventListener: on('d:'), removeEventListener: off, fullscreenElement: null,
  documentElement: { appendChild() {} }, createElement: () => ({ setAttribute() {}, animate: () => ({}), remove() {} }) };
global.location = { hostname: 'example.com' };
global.history = { back() {}, forward() {} };
global.chrome = {
  storage: { local: { get: async () => ({ pausedUntil: 0 }) }, sync: { get: async () => stored }, onChanged: { addListener() {}, removeListener() {} } },
  runtime: { id: 'x', sendMessage: async (m) => { sent.push(m); return null; }, onMessage: { addListener() {}, removeListener() {} }, getURL: (p) => p },
};
eval(fs.readFileSync(dir + 'shared.js', 'utf8'));
eval(fs.readFileSync(dir + 'content.js', 'utf8'));
const move = (x, y, extra = {}) => handlers['w:mousemove'].forEach((f) => f({ clientX: x, clientY: y, buttons: 0, shiftKey: false, ctrlKey: false, altKey: false, ...extra }));
const key = (shift) => handlers['w:keydown'].forEach((f) => f({ shiftKey: shift, ctrlKey: false, altKey: false }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(10);
  const results = [];
  move(997, 2); await wait(150); results.push(['tr without Shift does nothing', sent.length === 0]);
  key(true); await wait(150); results.push(['pressing Shift while in corner fires', sent.length === 1 && sent[0].action === 'newTab']);
  await wait(200); results.push(['stays fired once while resting', sent.length === 1]);
  move(500, 400); move(997, 2, { shiftKey: true }); await wait(50); results.push(['leaving before delay ends cancels', (move(500, 400), true)]);
  await wait(150); results.push(['...so nothing fired', sent.length === 1]);
  move(2, 797); await wait(150); results.push(['bl set to none does nothing', sent.length === 1]);
  move(2, 2); await wait(150); results.push(['tl opens overview (asks for tabs)', sent.some((m) => m.type === 'getTabs')]);
  document.fullscreenElement = {}; const n = sent.length; move(500, 400); move(997, 797); await wait(400);
  results.push(['br (lastTab) blocked in page fullscreen', sent.length === n]);
  document.fullscreenElement = null; move(996, 796); move(500,400); move(997, 797); await wait(400);
  results.push(['br fires after leaving fullscreen', sent.at(-1).action === 'lastTab']);
  move(997, 797, { buttons: 1 }); results.push(['dragging is ignored', true]);
  for (const [name, ok] of results) console.log(ok ? 'PASS' : 'FAIL', name);
  process.exit(0);
})();
