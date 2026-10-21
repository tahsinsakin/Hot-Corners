# Hot Corners — Chrome Web Store listing

Copy these into the fields of the Chrome Web Store Developer Dashboard.

---

## Store listing

**Name:** Hot Corners

**Summary** (from `manifest.json`, 132 characters max):
Turn the four corners of every page into shortcuts. Rest the pointer in a corner and your chosen action runs.

**Category:** Productivity → Tools

**Language:** English

### Description

Hot Corners turns the four corners of every web page into shortcuts. Rest the pointer in a corner and the action you picked for it runs. No clicks, no key combos to remember.

WHAT A CORNER CAN DO
• Tab overview: every tab from every window as a grid of live previews. Type to filter, click or press Enter to jump.
• Tabs: last used tab, next or previous tab, new tab, close, reopen closed, duplicate, pin, mute.
• Page: back, forward, reload, scroll to top or bottom.
• Window: new window, minimize, full screen.
• Custom: open any web address.

STAYS OUT OF YOUR WAY
• Hold-a-key corners: make a corner work only while Shift, Ctrl or Alt is held, so a stray pointer never sets it off.
• Adjustable delay and corner size.
• Rests automatically during full-screen video.
• One shortcut (Ctrl+Shift+H) turns everything off or back on; the toolbar icon turns grey while it's off.
• Pause for 15 minutes, an hour, or until Chrome restarts. It comes back on by itself.
• Exclude any site with one click.
• Right-click the toolbar icon for quick controls.
• Keyboard shortcut for the tab overview (Ctrl+Shift+Space).
• Light and dark theme.

PRIVATE BY DESIGN
Hot Corners collects nothing and sends nothing anywhere. Your settings live in your Chrome profile; tab previews stay in memory for the current session only.

Good to know: Chrome doesn't let extensions run on its own pages (the New Tab page, Settings, the Web Store). Corners are the corners of the page area below the tab bar; in full screen (F11) they match the corners of your screen.

### Images
- Store icon 128×128: `extension/icons/icon128.png`
- Small promo tile 440×280: `store/promo-small-440x280.png`
- Marquee 1400×560 (optional): `store/promo-marquee-1400x560.png`
- **Screenshots 1280×800 (at least 1, up to 5) — take these yourself:**
  1. The tab overview open over a window with several tabs.
  2. The settings page, Corners section.
  3. A page with the toolbar popup open.
  Resize the window to 1280×800 and capture it (Win+Shift+S on Windows).

---

## Privacy practices tab

**Single purpose:**
Run browser actions the user chooses (switching tabs, a tab overview, page and window actions) when the pointer rests in a corner of the page.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `storage` | Saves the user's corner settings and excluded sites; keeps tab previews in session memory. |
| `tabs` | Shows tab titles and addresses in the tab overview; switches, opens, closes, pins and mutes tabs. |
| `sessions` | Runs the "Reopen closed tab" action. |
| `scripting` | Starts corner detection in tabs that were already open when the extension was installed, without a reload. |
| `favicon` | Shows site icons in the tab overview and in settings. |
| `alarms` | Turns the extension back on when a 15-minute or 1-hour pause ends. |
| `contextMenus` | Shows the right-click menu on the toolbar icon (turn off/on, pause, this site). |
| Host permission `<all_urls>` | Corner detection must work on every site, so the content script runs on all pages. Tab previews in the overview use a capture of the visible tab (captureVisibleTab), which also needs this permission. Previews are shrunk and kept in session memory only; nothing is sent anywhere. |

**Remote code:** No. All code ships in the package.

**Data usage:** Tick none of the data types (nothing is collected). Tick the three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** the published `store/privacy.html` page.

---

## Submission notes
- Upload `dist/hot-corners-<version>.zip` from `./tools/package.sh` (manifest.json at the zip root).
- The first review often takes a few days because of the `<all_urls>` permission; the justification above is written for that.
- Other listings use the name "Hot Corners"; a distinctive name or subtitle can help in search.
- Raise `version` in `extension/manifest.json` for every update.
