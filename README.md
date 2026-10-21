# Hot Corners

**Every corner, a shortcut.** Hot Corners is a Chrome extension that turns the four corners of every web page into shortcuts. Rest the pointer in a corner and the action you picked for it runs.

![Hot Corners](store/promo-marquee-1400x560.png)

## Features

- **Tab overview:** every tab from every window as a grid of live previews. Type to filter, use the arrow keys and Enter to jump.
- **About 20 corner actions:** last used tab, next/previous tab, new tab, close, reopen closed, duplicate, pin, mute, back, forward, reload, scroll to top/bottom, new window, minimize, full screen, open a web address.
- **Hold-a-key corners:** a corner can require Shift, Ctrl or Alt, so stray pointer moves do nothing.
- **Quick control:** `Ctrl+Shift+H` turns everything off or on; pause for 15 min, 1 hour or until Chrome restarts; exclude sites. The toolbar icon shows the state (grey + `OFF`, `II` for paused, `–` for an excluded site).
- **Settings:** delay, corner size, corner glow, rest during full-screen video.
- Light and dark theme.

## Repository layout

| Folder | Contents |
|---|---|
| `extension/` | The extension itself (Manifest V3). The store zip is built from this folder. |
| `store/` | Store images, listing text (`STORE-LISTING.md`) and the privacy policy page. |
| `tools/` | Icon and image generator, packaging script and logic tests. |

## Development

**Try it locally:** open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select the `extension` folder. After a code change, press the reload icon on the extension card and reload open tabs.

**Tests** (Node 18+, no dependencies; Chrome APIs are stubbed):

```bash
node tools/test-corners.js      # corner detection, hold-a-key, delay, full screen
node tools/test-background.js   # on/off, pause, toolbar icon state, right-click menu
```

**Redraw the icons and store images** (Python 3 with Pillow and NumPy):

```bash
python3 tools/draw_icons.py
```

**Build the store package:**

```bash
./tools/package.sh   # dist/hot-corners-<version>.zip
```

Raise `version` in `extension/manifest.json` for every release.

## How it works

- `content.js` runs on each page: watches whether the pointer is in a corner, draws the tab overview (inside a Shadow DOM) and shows status notices.
- `background.js` performs tab and window actions, captures previews, and handles shortcuts, pausing, the toolbar icon state and the right-click menu.
- `shared.js` holds the action list, default settings and settings helpers.
- `popup.*` is the toolbar popup, `options.*` the full settings page, `ui.*` the parts they share.
- Settings live in `chrome.storage.sync`, the pause state in `chrome.storage.local`, previews in `chrome.storage.session`. Nothing is sent to any server.
