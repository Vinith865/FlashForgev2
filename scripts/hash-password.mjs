#!/usr/bin/env node
/**
 * Generate an ADMIN_PASSWORD_HASH value.
 *   node scripts/hash-password.mjs "my-strong-password"
 */
import crypto from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-password"');
  process.exit(1);
}

const ITERATIONS = 210000;
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex');

console.log('\nAdd these to your Vercel environment variables:\n');
console.log(`ADMIN_PASSWORD_HASH=pbkdf2_sha256:${ITERATIONS}:${salt}:${hash}`);
console.log(`ADMIN_TOKEN_SECRET=${crypto.randomBytes(48).toString('hex')}\n`);
