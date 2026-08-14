/**
 * RFC 6238 TOTP — compatible with Microsoft Authenticator, Google
 * Authenticator, Authy, 1Password and any other standard TOTP app.
 *
 * Deliberately SHA-1 / 6 digits / 30s: Microsoft Authenticator ignores the
 * `algorithm` parameter in otpauth URIs, so anything else silently produces
 * codes that never validate.
 */
import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD = 30;
export const DIGITS = 6;

/* ── Base32 (RFC 4648, unpadded) ────────────────────────────────────── */

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/* ── Secret + provisioning URI ──────────────────────────────────────── */

export function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

export function buildOtpAuthUri({ secret, account = 'admin', issuer = 'FlashForge' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ── Code generation + verification ─────────────────────────────────── */

export function currentStep(at = Date.now()) {
  return Math.floor(at / 1000 / PERIOD);
}

export function generateCode(secret, step = currentStep()) {
  const key = base32Decode(secret);
  if (!key.length) throw new Error('TOTP secret is empty or not valid base32.');

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Verifies a submitted code.
 * @returns {{valid: boolean, step?: number}} the matched step, so the caller
 *          can persist it and reject replays of the same code.
 */
export function verifyCode(secret, submitted, { window = 1, at = Date.now() } = {}) {
  const code = String(submitted || '').replace(/\D/g, '');
  if (code.length !== DIGITS) return { valid: false };

  const now = currentStep(at);
  for (let drift = -window; drift <= window; drift++) {
    const step = now + drift;
    let expected;
    try {
      expected = generateCode(secret, step);
    } catch {
      return { valid: false };
    }
    const a = Buffer.from(expected);
    const b = Buffer.from(code);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { valid: true, step };
    }
  }
  return { valid: false };
}

export function isTotpEnabled() {
  return Boolean(process.env.ADMIN_TOTP_SECRET);
}
