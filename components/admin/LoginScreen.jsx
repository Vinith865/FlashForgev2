'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft, KeyRound, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import Panel from '@/components/ui/Panel';

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
      <Panel className="w-full max-w-sm animate-slideUp p-7">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-neon-violet/25 bg-neon-violet/10">
            {step === 'totp' ? (
              <Smartphone size={22} className="text-neon-violet" />
            ) : (
              <ShieldCheck size={22} className="text-neon-violet" />
            )}
          </span>
          <h1 className="text-lg font-semibold text-slate-100">
            {step === 'totp' ? 'Two-factor code' : 'Admin console'}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {step === 'totp'
              ? 'Enter the 6-digit code from Microsoft Authenticator.'
              : 'Sign in to publish and manage firmware.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
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
            <div>
              <label className="label mb-1.5 block">Authenticator code</label>
              <input
                ref={codeRef}
                value={form.totp}
                onChange={(e) =>
                  setForm({ ...form, totp: e.target.value.replace(/\D/g, '').slice(0, 6) })
                }
                className="field text-center font-mono text-2xl tracking-[0.4em]"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
              <p className="mt-2 text-center text-[11px] text-slate-600">
                Codes refresh every 30 seconds.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (step === 'totp' && form.totp.length !== 6)}
            className="btn-primary w-full"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {step === 'totp' ? 'Verify' : 'Sign in'}
          </button>

          {step === 'totp' && (
            <button
              type="button"
              onClick={() => {
                setStep('password');
                setForm({ ...form, totp: '' });
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Use a different account
            </button>
          )}
        </form>

        {notice && (
          <p
            className={clsx(
              'mt-4 rounded-xl px-3 py-2 text-xs leading-relaxed',
              notice.type === 'error'
                ? 'bg-rose-500/10 text-rose-300'
                : 'bg-emerald-500/10 text-emerald-300'
            )}
          >
            {notice.text}
          </p>
        )}

        {config && !config.adminConfigured && (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
            No admin password is configured. Run{' '}
            <span className="font-mono">node scripts/hash-password.mjs</span> and set{' '}
            <span className="font-mono">ADMIN_PASSWORD_HASH</span> plus{' '}
            <span className="font-mono">ADMIN_TOKEN_SECRET</span>.
          </p>
        )}

        {config?.adminConfigured && !config.twoFactorEnabled && (
          <p className="mt-4 rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-slate-500">
            Two-factor is off. Run{' '}
            <span className="font-mono text-slate-400">node scripts/setup-2fa.mjs</span> to enable
            it.
          </p>
        )}

        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft size={12} /> Back to flasher
        </Link>
      </Panel>
    </main>
  );
}
