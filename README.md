# FlashForge — ESP32 & Arduino Web Flasher

A premium, browser-based firmware flashing platform. Flash an ESP32 or Arduino
straight from Chrome over the **Web Serial API** — no drivers, no IDE, no install.

Rebuilt as a **single Next.js app** so the whole thing (UI + API + storage)
deploys to Vercel in one shot.

---

## What's new in v2

| | v1 (Express + Next) | v2 (this) |
|---|---|---|
| Deploy | 2 services (Vercel + Render) | 1 Vercel project |
| Storage | local disk (breaks on serverless) | Vercel Blob, with local-disk dev fallback |
| Upload size | capped by request body | client-direct to Blob, up to 64 MB |
| Admin auth | plaintext password in `.env` | PBKDF2-SHA256 hash + HMAC tokens |
| UI | basic Tailwind | dark-glass design system, animated |
| Serial monitor | ✗ | ✓ live, with send + baud selector |
| Device info | ✗ | ✓ chip, MAC, flash size, crystal, features |
| Flash history | ✗ | ✓ local, with success/fail stats |
| Custom firmware | ✗ | ✓ drag-and-drop `.bin` / `.hex` |
| Search & filters | ✗ | ✓ search, category, board, sort, favourites |
| Share | ✗ | ✓ deep links + QR codes |

---

## Architecture

```
Browser (Chrome 89+)
├─ React UI ────────────────► /api/*        Next.js route handlers (Node runtime)
├─ esptool-js ──USB Serial──► ESP32 ROM bootloader
└─ STK500 ──────USB Serial──► Arduino AVR bootloader

/api/projects            public catalogue + manifests
/api/admin/*             authenticated publish / delete
/api/admin/blob-upload   client-direct upload handshake
Vercel Blob              firmware .bin/.hex, images, project index JSON
```

Nothing binary ever passes through the API on Vercel — the browser uploads
straight to Blob storage and downloads straight from the Blob CDN.

---

## Project layout

```
app/
  layout.jsx              root shell + fonts
  page.jsx                flasher
  admin/page.jsx          admin console
  globals.css             design system (glass, neon, animations)
  api/
    health/               storage + admin config probe
    projects/             list · detail · manifest · compatibility
    admin/                login · projects CRUD · blob-upload handshake
    uploads/[...path]/    local-mode static file server
components/
  layout/                 Header, animated Background
  ui/                     Panel, StatusPill, ProgressBar, Terminal, Modal, QrCode…
  flash/                  FlasherApp, ProjectCard, FilterBar, DropZone,
                          DeviceCard, SerialMonitor, HistoryPanel, ProjectDetail
  admin/AdminConsole.jsx
hooks/                    useFlasher, useProjects, useFavorites, useFlashHistory
services/                 serial.js (Web Serial), flash.js (esptool-js + STK500), api.js
lib/                      store.js (Blob/local), auth.js (PBKDF2 + HMAC), projects.js
scripts/hash-password.mjs
```

---

## Local development

```bash
npm install

# generate credentials
node scripts/hash-password.mjs "your-password"
# paste both lines into .env.local, plus ADMIN_USERNAME=admin

npm run dev      # http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, uploads are written to `./.uploads/` and the
project index to `./data/projects.json`. Both are gitignored.

> Web Serial needs a **secure context**. `localhost` counts, so dev works fine.

---

## Deploy to Vercel

See **[DEPLOY.md](./DEPLOY.md)** for the full walkthrough. Short version:

1. Push to GitHub → import into Vercel.
2. Storage → create a **Blob** store → connect it to the project.
3. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOKEN_SECRET`.
4. Deploy, open `/admin`, publish firmware.

---

## Flashing flow

1. Choose **ESP32** or **Arduino**.
2. Pick a project, or drop your own `.bin` / `.hex`.
3. **Connect** → Chrome shows a port picker → select the device.
4. **Flash** → manifest fetched → binaries downloaded → written → board reset.
5. Switch to **Serial monitor** to watch it boot.

For ESP32 boards without auto-reset: hold **BOOT**, tap **RESET**, release **BOOT**.

### Common ESP32 offsets

| Part | ESP32 | ESP32-S3 / C3 |
|---|---|---|
| bootloader | `0x1000` | `0x0` |
| partition table | `0x8000` | `0x8000` |
| ota_data | `0xe000` | `0xe000` |
| application | `0x10000` | `0x10000` |

---

## Browser support

| Browser | Web Serial |
|---|---|
| Chrome 89+ (desktop) | ✅ |
| Edge 89+ (desktop) | ✅ |
| Opera 76+ (desktop) | ✅ |
| Firefox / Safari | ❌ |
| Any mobile browser | ❌ |

---

## Security notes

- Admin passwords are stored as **PBKDF2-SHA256, 210k iterations**, never plaintext.
- Session tokens are **HMAC-SHA256 signed**, 8-hour TTL, verified in constant time.
- Plaintext `ADMIN_PASSWORD` is accepted **in development only** and hard-refused in production.
- Upload filenames are basename-stripped and extension-allowlisted (`.bin`, `.hex`).
- The local file route resolves and re-checks paths to block traversal.
- Blob upload tokens are minted only after the admin token is verified server-side.

## License

MIT
