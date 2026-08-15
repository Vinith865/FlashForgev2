/**
 * Persistent security state: session epoch, TOTP replay guard,
 * failed-login lockout and the audit trail.
 *
 * Lives alongside the project index so it survives cold starts — a purely
 * in-memory limiter is useless on serverless, where every request may land
 * on a fresh instance.
 */
import { readSecurityDoc, writeSecurityDoc } from './store';

const MAX_AUDIT_ENTRIES = 300;
const MAX_FAILURE_ENTRIES = 50;

export const LOCKOUT_THRESHOLD = 5;      // failures inside the window
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function clientIp(request) {
  const header =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    '';
  return header.split(',')[0].trim() || 'unknown';
}

/* ── Lockout ────────────────────────────────────────────────────────── */

export function lockoutState(doc, ip, now = Date.now()) {
  if (doc.lockedUntil && doc.lockedUntil > now) {
    return { locked: true, until: doc.lockedUntil, remainingMs: doc.lockedUntil - now };
  }
  // `cleared` entries stay in the record for the audit view but no longer
  // count toward a lockout — a successful sign-in proves identity.
  const recent = (doc.failures || []).filter(
    (f) => f.ip === ip && !f.cleared && now - f.at < LOCKOUT_WINDOW_MS
  );
  return { locked: false, recentFailures: recent.length, remaining: LOCKOUT_THRESHOLD - recent.length };
}

export async function recordFailure({ ip, username, reason }) {
  const doc = await readSecurityDoc();
  const now = Date.now();

  doc.failures = [{ at: now, ip, username, reason }, ...(doc.failures || [])].slice(
    0,
    MAX_FAILURE_ENTRIES
  );

  const recent = doc.failures.filter(
    (f) => f.ip === ip && !f.cleared && now - f.at < LOCKOUT_WINDOW_MS
  );
  if (recent.length >= LOCKOUT_THRESHOLD) {
    doc.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  await writeSecurityDoc(doc);
  return lockoutState(doc, ip, now);
}

/**
 * Called after a successful sign-in. Retires this IP's failures so they stop
 * counting toward a lockout, without deleting them — the audit panel should
 * still show that someone was guessing.
 */
export async function clearFailures(ip) {
  const doc = await readSecurityDoc();
  doc.failures = (doc.failures || []).map((f) =>
    f.ip === ip && !f.cleared ? { ...f, cleared: true } : f
  );
  doc.lockedUntil = 0;
  await writeSecurityDoc(doc);
}

/* ── TOTP replay guard ──────────────────────────────────────────────── */

export async function consumeTotpStep(step) {
  const doc = await readSecurityDoc();
  if (Number(doc.lastTotpStep || 0) >= step) return false; // already used
  doc.lastTotpStep = step;
  await writeSecurityDoc(doc);
  return true;
}

/* ── Sessions ───────────────────────────────────────────────────────── */

export async function currentEpoch() {
  const doc = await readSecurityDoc();
  return Number(doc.epoch || 1);
}

export async function revokeAllSessions(actor) {
  const doc = await readSecurityDoc();
  doc.epoch = Number(doc.epoch || 1) + 1;
  doc.audit = [
    { at: Date.now(), action: 'sessions.revoke_all', actor, detail: `epoch → ${doc.epoch}` },
    ...(doc.audit || []),
  ].slice(0, MAX_AUDIT_ENTRIES);
  await writeSecurityDoc(doc);
  return doc.epoch;
}

/* ── Audit ──────────────────────────────────────────────────────────── */

/** Auditing is best-effort — it must never break the operation it records. */
export async function audit({ action, actor = 'admin', detail = '', ip = '' }) {
  try {
    const doc = await readSecurityDoc();
    doc.audit = [{ at: Date.now(), action, actor, detail, ip }, ...(doc.audit || [])].slice(
      0,
      MAX_AUDIT_ENTRIES
    );
    await writeSecurityDoc(doc);
  } catch {
    // Auditing must never break the operation it is recording.
  }
}

export async function readAudit() {
  const doc = await readSecurityDoc();
  return {
    audit: doc.audit || [],
    failures: (doc.failures || []).slice(0, 20),
    epoch: Number(doc.epoch || 1),
    lockedUntil: doc.lockedUntil || 0,
  };
}
