// Shared building blocks for popup.html and options.html.
globalThis.UI = (() => {
  const OUTER = 'M0.06 -1 C0.18 -0.70 0.44 -0.50 0.42 -0.16 C0.40 0.16 0.21 0.34 0 0.34 ' +
    'C-0.23 0.34 -0.42 0.15 -0.42 -0.13 C-0.42 -0.37 -0.28 -0.48 -0.24 -0.66 ' +
    'C-0.13 -0.50 -0.09 -0.44 -0.05 -0.39 C-0.07 -0.63 -0.04 -0.83 0.06 -1 Z';
  const INNER = 'M0.03 -0.56 C0.13 -0.39 0.23 -0.25 0.22 -0.05 C0.21 0.14 0.11 0.23 0 0.23 ' +
    'C-0.12 0.23 -0.22 0.13 -0.22 -0.04 C-0.22 -0.23 -0.08 -0.35 0.03 -0.56 Z';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function injectFlameDefs() {
    if (document.getElementById('hcFlame')) return;
    const holder = document.createElement('div');
    holder.innerHTML = `
      <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hcFlameOuter" gradientUnits="userSpaceOnUse" x1="0" y1="0.34" x2="0" y2="-1">
            <stop offset="0" stop-color="#FFDE46"/><stop offset="1" stop-color="#FF9600"/>
          </linearGradient>
          <linearGradient id="hcFlameInner" gradientUnits="userSpaceOnUse" x1="0" y1="0.23" x2="0" y2="-0.3">
            <stop offset="0" stop-color="#FFFCDE"/><stop offset="1" stop-color="#FFE45C"/>
          </linearGradient>
          <symbol id="hcFlame" viewBox="-0.5 -1.05 1 1.45">
            <path fill="url(#hcFlameOuter)" d="${OUTER}"/>
            <path fill="url(#hcFlameInner)" d="${INNER}"/>
          </symbol>
        </defs>
      </svg>`;
    document.body.prepend(holder.firstElementChild);
  }

  function flame(key) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'flame ' + key);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#hcFlame');
    svg.append(use);
    return svg;
  }

  // ---------- settings store with debounced saves and outside-change sync ----------

  async function createStore() {
    let settings = await HC.load();
    let timer = 0;
    let lastSaved = JSON.stringify(settings);
    const listeners = new Set();
    let toast = null;

    function flash() {
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.textContent = 'Kaydedildi';
        document.body.append(toast);
      }
      toast.classList.add('show');
      clearTimeout(flash.t);
      flash.t = setTimeout(() => toast.classList.remove('show'), 1100);
    }

    function save(debounce = 0, { quiet = false } = {}) {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        lastSaved = JSON.stringify(settings);
        await HC.save(settings);
        if (!quiet) flash();
      }, debounce);
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes.settings) return;
      const json = JSON.stringify(HC.merge(changes.settings.newValue));
      if (json === lastSaved) return; // our own write
      settings = JSON.parse(json);
      lastSaved = json;
      listeners.forEach((fn) => fn());
    });

    return {
      get settings() { return settings; },
      set settings(v) { settings = v; },
      save,
      onExternalChange(fn) { listeners.add(fn); },
    };
  }

  // ---------- the corner editor ----------

  function fillActions(select) {
    for (const { group, items } of HC.ACTIONS) {
      const og = document.createElement('optgroup');
      og.label = group;
      for (const [value, label] of items) og.append(new Option(label, value));
      select.append(og);
    }
  }

  /**
   * Builds four corner controls inside `screen`.
   * full=true adds the corner name and the modifier select (options page);
   * full=false shows the modifier as a small chip (popup).
   */
  function buildCorners(screen, store, { full }) {
    injectFlameDefs();
    const parts = {};

    for (const key of ['tl', 'tr', 'bl', 'br']) {
      const box = document.createElement('div');
      box.className = 'corner ' + key;
      const name = HC.CORNER_NAMES[key] + ' köşe';

      const action = document.createElement('select');
      action.setAttribute('aria-label', name + ' görevi');
      fillActions(action);

      const url = document.createElement('input');
      url.type = 'text';
      url.className = 'field';
      url.placeholder = 'ornek.com';
      url.spellcheck = false;
      url.setAttribute('aria-label', name + ' adresi');

      const items = [];
      if (full) {
        const label = document.createElement('div');
        label.className = 'corner-name';
        label.textContent = name;
        items.push(label);
      }
      items.push(action, url);

      let modifier = null;
      let chip = null;
      if (full) {
        modifier = document.createElement('select');
        modifier.setAttribute('aria-label', name + ' için basılı tutulacak tuş');
        for (const [v, l] of HC.MODIFIERS) modifier.append(new Option(l, v));
        items.push(modifier);
      } else {
        chip = document.createElement('span');
        chip.className = 'chip';
        items.push(chip);
      }
      box.append(...items);
      screen.append(box, flame(key));

      action.addEventListener('change', () => {
        store.settings.corners[key].action = action.value;
        render();
        store.save();
        if (action.value === 'openUrl') url.focus();
      });
      url.addEventListener('input', () => {
        store.settings.corners[key].url = url.value.trim();
        store.save(500);
      });
      if (modifier) {
        modifier.addEventListener('change', () => {
          store.settings.corners[key].modifier = modifier.value;
          render();
          store.save();
        });
      }

      parts[key] = { action, url, modifier, chip, flame: screen.querySelector('.flame.' + key) };
    }

    function render() {
      for (const [key, p] of Object.entries(parts)) {
        const c = store.settings.corners[key];
        p.action.value = c.action;
        p.action.title = HC.actionLabel(c.action);
        if (document.activeElement !== p.url) p.url.value = c.url || '';
        p.url.hidden = c.action !== 'openUrl';
        const active = c.action !== 'none';
        p.flame.classList.toggle('on', active);
        if (p.modifier) {
          p.modifier.value = c.modifier || 'none';
          p.modifier.hidden = !active;
        }
        if (p.chip) {
          const m = c.modifier && c.modifier !== 'none' && active;
          p.chip.hidden = !m;
          if (m) p.chip.textContent = { shift: 'Shift', ctrl: 'Ctrl', alt: 'Alt' }[c.modifier] + ' ile';
        }
      }
    }

    render();
    return render;
  }

  function bindSwitch(input, store, onChange) {
    input.checked = store.settings.enabled;
    input.addEventListener('change', () => {
      store.settings.enabled = input.checked;
      store.save();
      // Turning it on also ends any pause.
      if (input.checked) {
        chrome.alarms.clear('unpause');
        chrome.storage.local.set({ pausedUntil: 0 });
      }
      onChange();
    });
  }

  async function shortcutText(name = 'open-overview') {
    try {
      const cmds = await chrome.commands.getAll();
      const c = cmds.find((x) => x.name === name);
      return c && c.shortcut ? c.shortcut : '';
    } catch {
      return '';
    }
  }

  // "Ctrl+Shift+H" -> <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd>
  function keysInto(el, keys) {
    el.replaceChildren();
    if (!keys) { el.textContent = 'Atanmamış'; return; }
    keys.split('+').forEach((k, i) => {
      if (i) el.append('+');
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      el.append(kbd);
    });
  }

  function openShortcuts() {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  }

  return { createStore, buildCorners, bindSwitch, shortcutText, keysInto, openShortcuts };
})();
