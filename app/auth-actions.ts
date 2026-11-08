'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authEnabled, env, isAllowedEmail } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export interface FormState {
  error?: string;
  message?: string;
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : env.siteUrl;
}

function safeNext(v: FormDataEntryValue | null, fallback: string): string {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (!authEnabled) redirect('/onboarding');
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const firstName = String(form.get('first_name') ?? '').trim().slice(0, 40);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (password.length < 8) return { error: 'Your password needs at least 8 characters.' };
  if (!isAllowedEmail(email)) return { error: 'OnWatch is a private site and isn’t taking new sign-ups.' };

  const supabase = (await createClient())!;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName }, emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: `Almost there. We sent a link to ${email}. Open it to confirm your account.` };
  redirect('/onboarding');
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const next = safeNext(form.get('next'), '/today');
  if (!authEnabled) redirect(next);
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const supabase = (await createClient())!;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'That email and password don’t match. Try again or reset your password.' };
  redirect(next);
}

export async function signInWithProvider(form: FormData): Promise<void> {
  const provider = form.get('provider') === 'apple' ? 'apple' : 'google';
  if (!authEnabled) redirect('/onboarding');
  const supabase = (await createClient())!;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/callback?next=/today` },
  });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}

export async function sendReset(_prev: FormState, form: FormData): Promise<FormState> {
  if (!authEnabled) return { message: 'Accounts are not switched on yet.' };
  const email = String(form.get('email') ?? '').trim();
  const supabase = (await createClient())!;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?next=/settings` });
  return { message: 'If that email has an account, a reset link is on its way.' };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/');
}
