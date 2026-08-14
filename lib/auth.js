/**
 * Admin authentication.
 * Stateless HMAC-signed tokens + PBKDF2-SHA256 password verification.
 * Runs on the Node.js runtime (uses node:crypto).
 */
import crypto from 'node:crypto';
import { currentEpoch } from './security';

const SCHEME = 'pbkdf2_sha256';
const ITERATIONS = 210_000;
const KEYLEN = 32;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

/* ── Password hashing ───────────────────────────────────────────────── */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, ITERATIONS, KEYLEN, 'sha256')
    .toString('hex');
  // ':' rather than '$' — dotenv performs variable expansion on '$' and would
  // silently mangle the hash inside .env files.
  return `${SCHEME}:${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const raw = String(storedHash || '').trim();
  const [scheme, iterText, salt, expected] = raw.includes(':') ? raw.split(':') : raw.split('$');
  const iterations = Number(iterText);
  if (scheme !== SCHEME || !Number.isInteger(iterations) || !salt || !expected) return false;

  const actual = crypto
    .pbkdf2Sync(String(password), salt, iterations, KEYLEN, 'sha256')
    .toString('hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function constantTimeEqualText(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so timing stays flat-ish.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getSecret() {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_TOKEN_SECRET is missing. Set a long random value in your Vercel project settings.'
    );
  }
  return 'insecure-local-development-secret-do-not-ship';
}

const b64url = (v) => Buffer.from(v).toString('base64url');
const unb64url = (v) => Buffer.from(v, 'base64url').toString('utf8');
const sign = (payload) =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

/* ── Credentials ────────────────────────────────────────────────────── */

export function verifyAdminCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  if (!constantTimeEqualText(username, expectedUser)) return false;

  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (storedHash) return verifyPassword(password, storedHash);

  // Plaintext fallback is development-only, by design.
  const plain = process.env.ADMIN_PASSWORD;
  if (plain && process.env.NODE_ENV !== 'production') {
    return constantTimeEqualText(password, plain);
  }
  return false;
}

export function isAdminConfigured() {
  return Boolean(
    process.env.ADMIN_PASSWORD_HASH ||
      (process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== 'production')
  );
}

/* ── Tokens ─────────────────────────────────────────────────────────── */

export async function createAdminToken(username) {
  const payload = b64url(
    JSON.stringify({
      sub: username,
      aud: 'esp32-flasher-admin',
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL_MS,
      epoch: await currentEpoch(),
      jti: crypto.randomBytes(12).toString('hex'),
    })
  );
  return `${payload}.${sign(payload)}`;
}

/** Signature + expiry only. Does not check the session epoch. */
export function decodeAdminToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const claims = JSON.parse(unb64url(payload));
    if (claims.aud !== 'esp32-flasher-admin') return null;
    if (!(Number(claims.exp) > Date.now())) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Full check: signature, expiry, and that the session hasn't been revoked. */
export async function verifyAdminToken(token) {
  const claims = decodeAdminToken(token);
  if (!claims) return null;
  if (Number(claims.epoch || 0) !== (await currentEpoch())) return null;
  return claims;
}

export function bearerFrom(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

/**
 * Returns `{ denied: Response }` when unauthorised, or `{ claims }` when the
 * caller is a valid, non-revoked admin.
 */
export async function requireAdmin(request) {
  const claims = await verifyAdminToken(bearerFrom(request));
  if (claims) return { claims };

  return {
    denied: Response.json(
      { success: false, error: 'Admin login required' },
      { status: 401 }
    ),
  };
}
