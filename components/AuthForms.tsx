'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signIn, signInWithProvider, signUp, sendReset, type FormState } from '@/app/auth-actions';

function ProviderButtons({ enableApple }: { enableApple: boolean }) {
  return (
    <form action={signInWithProvider} className="stack" style={{ gap: 10 }}>
      <button className="btn big wide" name="provider" value="google" type="submit" style={{ textTransform: 'none', letterSpacing: 0 }}>
        Continue with Google
      </button>
      {enableApple && (
        <button className="btn big wide" name="provider" value="apple" type="submit" style={{ textTransform: 'none', letterSpacing: 0 }}>
          Continue with Apple
        </button>
      )}
    </form>
  );
}

export function SignUpForm({ enableApple }: { enableApple: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  return (
    <div className="card" aria-labelledby="form-title">
      <div className="stack" style={{ gap: 8 }}>
        <div className="label" style={{ color: 'var(--muted)' }}>Step 1 of 3</div>
        <div className="progress" aria-hidden="true"><span className="on" /><span /><span /></div>
      </div>
      <h2 id="form-title" className="head" style={{ fontSize: 38, lineHeight: 1 }}>Create your free account</h2>
      <ProviderButtons enableApple={enableApple} />
      <div className="divider">or with email</div>
      <form action={action} className="stack" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="su-name">First name</label>
          <input id="su-name" name="first_name" className="input" autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="su-pw">Password</label>
          <input id="su-pw" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" aria-describedby="su-pw-hint" />
          <span id="su-pw-hint" className="small">At least 8 characters.</span>
        </div>
        {state.error && <div role="alert" className="error">{state.error}</div>}
        {state.message && <div role="status" className="success">{state.message}</div>}
        <button className="btn solid big" type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create free account →'}</button>
      </form>
      <div style={{ fontSize: 13 }}>Already have an account? <Link href="/login" className="bold">Log in</Link></div>
      <div className="small">By signing up you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>. OnWatch gives information, not investment advice.</div>
    </div>
  );
}

export function LoginForm({ next, enableApple, error }: { next: string; enableApple: boolean; error?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const [reset, resetAction, resetPending] = useActionState<FormState, FormData>(sendReset, {});
  return (
    <div className="card">
      <h1 className="head" style={{ fontSize: 38, lineHeight: 1 }}>Welcome back</h1>
      {error && <div role="alert" className="error">{error === 'private' ? 'OnWatch is a private site. This account doesn’t have access.' : error === 'link' ? 'That link has expired. Please log in again.' : 'Sign-in didn’t finish. Please try again.'}</div>}
      <ProviderButtons enableApple={enableApple} />
      <div className="divider">or with email</div>
      <form action={action} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="li-email">Email</label>
          <input id="li-email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="li-pw">Password</label>
          <input id="li-pw" name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        {state.error && <div role="alert" className="error">{state.error}</div>}
        <button className="btn solid big" type="submit" disabled={pending}>{pending ? 'Logging in…' : 'Log in →'}</button>
      </form>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 40, display: 'flex', alignItems: 'center' }}>Forgot your password?</summary>
        <form action={resetAction} className="stack" style={{ gap: 10, paddingTop: 8 }}>
          <div className="field">
            <label htmlFor="rs-email">Email</label>
            <input id="rs-email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          {reset.message && <div role="status" className="success">{reset.message}</div>}
          <button className="btn" type="submit" disabled={resetPending}>Send reset link</button>
        </form>
      </details>
      <div style={{ fontSize: 13 }}>New here? <Link href="/" className="bold">Create a free account</Link></div>
    </div>
  );
}
