# Deploying to Vercel

Roughly 10 minutes end to end.

---

## 1 · Push the code to GitHub

```bash
cd esp32-flasher-pro
git init
git add .
git commit -m "FlashForge v2"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/esp32-flasher-pro.git
git push -u origin main
```

`.env.local`, `node_modules`, `.next`, `.uploads` and `data/projects.json`
are gitignored — nothing secret goes up.

---

## 2 · Import into Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. Pick the repo. Framework auto-detects as **Next.js** — leave every build
   setting on its default.
3. Click **Deploy**. The first deploy will succeed but the library will be
   empty and `/admin` will refuse to sign you in — that's expected until
   step 3 and 4.

---

## 3 · Create the Blob store

Firmware files need somewhere persistent to live. Vercel's filesystem is
read-only, so we use Blob storage.

1. Open your project → **Storage** tab → **Create Database** → **Blob**.
2. Name it (e.g. `flashforge-firmware`) → **Create**.
3. **Connect** it to this project, all environments.

Vercel injects `BLOB_READ_WRITE_TOKEN` automatically. The app detects it and
switches from local-disk mode to Blob mode — check `/api/health` to confirm:

```json
{ "storage": "vercel-blob", "adminConfigured": true }
```

The free tier covers a generous amount of storage and bandwidth, which is
plenty for firmware binaries.

---

## 4 · Set the admin credentials

Locally, generate a hash and a signing secret:

```bash
node scripts/hash-password.mjs "pick-a-strong-password"
```

It prints two lines. In Vercel → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `ADMIN_USERNAME` | `admin` (or whatever you like) |
| `ADMIN_PASSWORD_HASH` | the `pbkdf2_sha256:...` line |
| `ADMIN_TOKEN_SECRET` | the long random hex string |

Optionally:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` — used for share links and QR codes |

> The hash uses `:` separators rather than `$` on purpose — dotenv performs
> variable expansion on `$` and would silently corrupt the value.

Then **Deployments → ⋯ → Redeploy** so the new variables take effect.

---

## 5 · Publish your first firmware

1. Visit `https://your-app.vercel.app/admin`.
2. Sign in with the username and password from step 4.
3. Fill in the project details, tick the supported boards.
4. **Add .bin / .hex** — set the offset for each part:
   - `bootloader.bin` → `0x1000` (or `0x0` on S3/C3)
   - `partition-table.bin` → `0x8000`
   - `firmware.bin` → `0x10000`
5. **Publish project.**

Files stream straight from your browser to Blob storage, so the 4.5 MB
serverless request limit doesn't apply — anything up to 64 MB works.

---

## 6 · Flash something

Open the site in Chrome, plug in a board, hit **Connect**, then **Flash**.

---

## Custom domain

Project → **Settings → Domains** → add your domain and follow the DNS
instructions. HTTPS is provisioned automatically — which matters, because
Web Serial only runs in a secure context.

---

## Troubleshooting

**`/api/health` says `local-filesystem` in production**
The Blob store isn't connected. Redo step 3, then redeploy.

**"No admin password configured"**
`ADMIN_PASSWORD_HASH` is missing or was set for the wrong environment.
Confirm it's applied to Production and redeploy.

**Login fails with the right password**
The hash was probably mangled by `$` expansion. Regenerate with the current
script (it emits `:` separators) and paste the whole line.

**Uploads fail with 413**
You're on the base64 path instead of client-direct upload, which means Blob
isn't configured. See step 3.

**Chrome shows no serial ports**
Use a data USB cable (not charge-only), and install the CH340 or CP2102
driver if your OS needs one. Close the Arduino IDE and any other serial
monitor first — the port can only be held by one program at a time.

**Flash stalls at "Connecting…"**
Hold **BOOT**, tap **RESET**, release **BOOT**, then retry. Some boards need
this every time.

---

## Optional: keep the old Hostinger PHP backend

Not needed. v2 replaces it entirely — the Next.js API routes serve the same
endpoint shapes (`/api/projects`, `/api/projects/:id/manifest`, …), so any
existing client of the old API keeps working.
