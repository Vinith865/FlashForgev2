'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';

export default function LoginScreen({ onSubmit, config, busy, notice }) {
  const [step, setStep] = useState('password');
  const [form, setForm] = useState({ username: 'admin', password: '', totp: '' });
  const codeRef = useRef(null);

  useEffect(() => {
    if (notice?.totpRequired) setStep('totp');
  }, [notice]);

  useEffect(() => {
    if (step === 'totp') codeRef.current?.focus();
  }, [step]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="card animate-slideUp p-9 shadow-pop">
          <div className="mb-7 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="TE Flasher" width={72} height={72} className="mx-auto mb-5 h-[72px] w-[72px]" />
            <h1 className="text-[32px] font-bold leading-tight tracking-tightest text-ink-900">Sign in</h1>
            <p className="mt-2 text-sm text-ink-500">
              {step === 'totp'
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Sign in to publish and manage firmware.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {step === 'password' ? (
              <>
                <div>
                  <label className="label mb-1.5 block">Username</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="field"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="field"
                    autoComplete="current-password"
                  />
                </div>
              </>
            ) : (
              <input
                ref={codeRef}
                value={form.totp}
                onChange={(e) => setForm({ ...form, totp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full rounded-xl border-2 border-brand-500 bg-surface px-4 py-4 text-center font-mono text-3xl tracking-[0.5em] text-ink-900 shadow-focus outline-none placeholder:text-ink-400 placeholder:tracking-[0.5em]"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            )}

            <button
              type="submit"
              disabled={busy || (step === 'totp' && form.totp.length !== 6)}
              className="btn-primary btn-lg w-full"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {step === 'totp' ? 'Verify code' : 'Sign in'}
            </button>

            {step === 'totp' && (
              <button
                type="button"
                onClick={() => { setStep('password'); setForm({ ...form, totp: '' }); }}
                className="w-full text-center text-sm font-semibold text-ink-700 hover:text-brand-600"
              >
                Use a different sign-in method
              </button>
            )}
          </form>

          {notice && (
            <p
              className={clsx(
                'mt-5 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
                notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {notice.text}
            </p>
          )}

          {config && !config.adminConfigured && (
            <p className="mt-5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-800">
              No admin password is configured. Run{' '}
              <span className="font-mono">node scripts/hash-password.mjs</span> and set{' '}
              <span className="font-mono">ADMIN_PASSWORD_HASH</span> plus{' '}
              <span className="font-mono">ADMIN_TOKEN_SECRET</span>.
            </p>
          )}

          {config?.adminConfigured && !config.twoFactorEnabled && (
            <p className="mt-5 rounded-xl bg-canvas px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
              Two-factor is off. Run{' '}
              <span className="font-mono text-ink-700">node scripts/setup-2fa.mjs</span> to enable it.
            </p>
          )}
        </div>

        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft size={13} /> Back to flasher
        </Link>
      </div>
    </main>
  );
}
