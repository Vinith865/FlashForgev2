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

## 3 · Create the Blob store — it must be PUBLIC

Firmware files need somewhere persistent to live. Vercel's filesystem is
read-only, so we use Blob storage.

> ⚠️ **Choose Public access when creating the store.** A store's access mode is
> fixed at creation and cannot be changed afterwards. The flasher writes firmware
> with `access: 'public'` so the browser can download `.bin` files straight from
> the CDN — against a private store, uploads fail. If you already made a private
> store, delete it and create a new one.

1. Open your project → **Storage** tab → **Create Database** → **Blob**.
2. Name it (e.g. `flashforge-firmware`), set access to **Public** → **Create**.
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

### Two-factor authentication

Strongly recommended, since the admin console can overwrite firmware that people
then flash onto hardware.

```bash
node scripts/setup-2fa.mjs
```

This prints a QR code in your terminal. In **Microsoft Authenticator**:

1. Tap **+** → **Other account (Google, Facebook, etc.)**
2. Scan the QR code
3. Can't scan? Choose **Enter code manually** and type the key it printed

Then add the value it gives you to Vercel:

| Name | Value |
|---|---|
| `ADMIN_TOTP_SECRET` | the base32 string from the script |

Leave `ADMIN_TOTP_SECRET` unset to run with password only — the console will
show a banner reminding you 2FA is off.

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
5. Tick **Save as draft** if you want to test it before others can see it.
6. **Publish project.**

Files stream straight from your browser to Blob storage, so the 4.5 MB
serverless request limit doesn't apply — anything up to 64 MB works.

### Afterwards

- **Edit** — click the pencil on any project to change metadata; firmware stays put.
- **Manage files** — expand a project to add a `.bin`, change one offset, or remove
  a single part.
- **Eye icon** — flip between draft and live.
- **Activity tab** — every action, plus failed sign-in attempts.
- **Revoke all** — invalidates every session everywhere. Use it if a laptop goes
  missing.

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

**Uploads fail with an access or permission error**
Your Blob store is private. Access mode is fixed at creation — create a new
**public** store and reconnect it. See step 3.

**"That code isn't valid"**
Your phone's clock has drifted. TOTP allows ±30 seconds. Turn on automatic
time sync on the device running Microsoft Authenticator.

**"That code has already been used"**
Each code is single-use. Wait for the next one to appear.

**Locked out**
Five failed attempts from one IP triggers a 15-minute lockout. It clears on its
own; there's nothing to reset.

**Lost your authenticator**
Delete `ADMIN_TOTP_SECRET` in Vercel and redeploy — that reverts to password-only
sign-in. Then run `setup-2fa.mjs` again and re-enrol.

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
