#!/usr/bin/env node
/**
 * Enrols an authenticator app (Microsoft Authenticator, Google Authenticator,
 * Authy, 1Password — any TOTP app).
 *
 *   node scripts/setup-2fa.mjs [account-name]
 *
 * Prints a QR code in the terminal, then the env var to paste into Vercel.
 */
import { buildOtpAuthUri, generateCode, generateTotpSecret } from '../lib/totp.js';

const account = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
const secret = generateTotpSecret();
const uri = buildOtpAuthUri({ secret, account });

console.log('\n─────────────────────────────────────────────────────');
console.log('  TE Flasher · two-factor enrolment');
console.log('─────────────────────────────────────────────────────\n');

try {
  const QRCode = (await import('qrcode')).default;
  console.log(await QRCode.toString(uri, { type: 'terminal', small: true }));
} catch {
  console.log('(install dependencies with `npm install` to render the QR here)\n');
}

console.log('1. Open Microsoft Authenticator');
console.log('2. "+" → Other account (Google, Facebook, etc.)');
console.log('3. Scan the QR above\n');
console.log('   Can\'t scan? Choose "Enter code manually" and type:\n');
console.log(`   Account : ${account}`);
console.log(`   Key     : ${secret}\n`);
console.log('─────────────────────────────────────────────────────');
console.log('  Add this to your Vercel environment variables:');
console.log('─────────────────────────────────────────────────────\n');
console.log(`ADMIN_TOTP_SECRET=${secret}\n`);
console.log(`Your app should be showing: ${generateCode(secret)}`);
console.log('(codes rotate every 30 seconds)\n');
console.log('Keep this secret safe — anyone holding it can generate your codes.\n');
