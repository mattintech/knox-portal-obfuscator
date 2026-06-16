# Knox Portal Obfuscator

A browser extension that masks sensitive data on the [Samsung Knox](https://www.samsungknox.com) admin portal so you can **safely screen-share with customers** — license keys, IMEIs, serial numbers, emails, and MAC addresses are hidden, while staying easy to reveal and copy when you're working solo.

> Mask style keeps the first and last segment so you can still reference a value out loud
> (example uses a fake key): `KLM12-AAAAA-BBBBB-CCCCC-DDDDD-EEEEE` → `KLM12-*****-*****-*****-*****-EEEEE`

## Two modes (toggle with the toolbar icon)

| Mode | Toolbar icon | Behavior |
|------|--------------|----------|
| **Private** | 🟢 green (closed lock) | Sensitive values are masked. Safe to screen share. |
| **Show** | 🔴 red (open lock) | Real values shown. |

**Copy works in either mode:** hover any value → a **COPY** pill appears → click it to copy the
real value to your clipboard. Clicking the value itself follows its link normally. (Copying the real
value never reveals it on screen, so it's safe even while screen sharing in Private mode.)

## What gets masked

On by default: **license keys (KLM…)**, **IMEI/MEID**, **Samsung serials**, **emails**, **Wi-Fi MAC addresses**.
Off by default (toggle in options): **order numbers**, **phone numbers**.

Configure which types are masked via the extension's **Options** page (right-click the toolbar icon → Options).

## Install (from source)

### Chrome / Edge
1. `./build.sh`
2. Go to `chrome://extensions` (or `edge://extensions`), enable **Developer mode**
3. **Load unpacked** → select `dist/chrome`

### Firefox
1. `./build.sh`
2. Go to `about:debugging#/runtime/this-firefox`
3. **Load Temporary Add-on** → select `dist/firefox/manifest.json`

> Edge uses the **same package** as Chrome — both are Chromium.

## Build

```bash
./build.sh
```

Produces:
- `dist/chrome/` + `dist/knox-obfuscator-chrome.zip` (Chrome Web Store / Edge Add-ons)
- `dist/firefox/` + `dist/knox-obfuscator-firefox.zip` (Firefox Add-ons / AMO)

## Project layout

```
src/            shared extension source (used by both browsers)
manifests/      chrome.json + firefox.json (merged in at build time)
build.sh        produces dist/<browser>/ and store zips
tools/          dev-only CDP inspector (not shipped)
```

## Privacy

Everything runs locally in your browser. The extension reads page text only to mask it, stores **nothing** off-device, and sends **no** network requests. Settings are saved with the browser's own `storage.sync`.

## Disclaimer

This is an independent, unofficial project and is **not affiliated with, endorsed by, or
sponsored by Samsung Electronics Co., Ltd. or Samsung Knox**. "Samsung", "Knox", and related
names and logos are trademarks of their respective owners and are used here only to describe
the website this tool operates on. Use at your own risk; no warranty is provided.

## License

MIT © mattintech
