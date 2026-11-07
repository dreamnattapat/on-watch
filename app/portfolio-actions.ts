'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authEnabled } from '@/lib/config';
import { createClient, getUser } from '@/lib/supabase/server';
import { market } from '@/lib/market';

export interface HoldingInput {
  ticker: string;
  shares: number | null;
  avgCost: number | null;
}

export interface Prefs {
  briefTime: string;
  briefChannel: 'email' | 'line' | 'push' | 'none';
  alertBigMove: boolean;
  alertEarnings: boolean;
  alertMoodFlip: boolean;
  alertUndervalued: boolean;
}

const TICKER = /^[A-Z][A-Z.]{0,5}$/;

function cleanNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null;
}

/** Check that a ticker exists before saving it. Returns the company name or null. */
export async function lookupTicker(raw: string): Promise<{ ok: boolean; ticker: string; name?: string; error?: string }> {
  const ticker = raw.trim().toUpperCase();
  if (!TICKER.test(ticker)) return { ok: false, ticker, error: 'Enter a US ticker, like AAPL or NVDA.' };
  const profile = await market.getProfile(ticker);
  if (!profile) return { ok: false, ticker, error: `We couldn’t find ${ticker}. Check the ticker and try again.` };
  return { ok: true, ticker, name: profile.name };
}

export async function finishOnboarding(holdings: HoldingInput[], prefs: Prefs): Promise<{ error?: string }> {
  if (!authEnabled) redirect('/today');
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = (await createClient())!;

  const rows = holdings
    .map((h) => ({ ticker: h.ticker.trim().toUpperCase(), shares: cleanNumber(h.shares), avg_cost: cleanNumber(h.avgCost) }))
    .filter((h) => TICKER.test(h.ticker))
    .slice(0, 100)
    .map((h) => ({ ...h, user_id: user.id }));

  if (rows.length) {
    const { error } = await supabase.from('holdings').upsert(rows, { onConflict: 'user_id,ticker' });
    if (error) return { error: 'We couldn’t save your stocks. Please try again.' };
  }
  const { error } = await supabase.from('profiles').update({
    brief_time: prefs.briefTime,
    brief_channel: prefs.briefChannel,
    alert_big_move: prefs.alertBigMove,
    alert_earnings: prefs.alertEarnings,
    alert_mood_flip: prefs.alertMoodFlip,
    alert_undervalued: prefs.alertUndervalued,
    onboarded: true,
  }).eq('id', user.id);
  if (error) return { error: 'We couldn’t save your settings. Please try again.' };
  redirect('/today');
}

export async function addHolding(h: HoldingInput): Promise<{ error?: string }> {
  if (!authEnabled) return { error: 'Demo mode: connect Supabase to save stocks.' };
  const user = await getUser();
  if (!user) return { error: 'Please log in again.' };
  const check = await lookupTicker(h.ticker);
  if (!check.ok) return { error: check.error };
  const supabase = (await createClient())!;
  const { error } = await supabase.from('holdings').upsert(
    { user_id: user.id, ticker: check.ticker, shares: cleanNumber(h.shares), avg_cost: cleanNumber(h.avgCost) },
    { onConflict: 'user_id,ticker' },
  );
  if (error) return { error: 'We couldn’t save that stock. Please try again.' };
  revalidatePath('/', 'layout');
  return {};
}

export async function removeHolding(ticker: string): Promise<{ error?: string }> {
  if (!authEnabled) return { error: 'Demo mode: connect Supabase to save stocks.' };
  const user = await getUser();
  if (!user) return { error: 'Please log in again.' };
  const supabase = (await createClient())!;
  const { error } = await supabase.from('holdings').delete().eq('user_id', user.id).eq('ticker', ticker);
  if (error) return { error: 'We couldn’t remove that stock. Please try again.' };
  revalidatePath('/', 'layout');
  return {};
}

export async function savePrefs(prefs: Prefs & { firstName?: string }): Promise<{ error?: string; ok?: boolean }> {
  if (!authEnabled) return { error: 'Demo mode: connect Supabase to save settings.' };
  const user = await getUser();
  if (!user) return { error: 'Please log in again.' };
  const supabase = (await createClient())!;
  const { error } = await supabase.from('profiles').update({
    first_name: prefs.firstName?.slice(0, 40),
    brief_time: prefs.briefTime,
    brief_channel: prefs.briefChannel,
    alert_big_move: prefs.alertBigMove,
    alert_earnings: prefs.alertEarnings,
    alert_mood_flip: prefs.alertMoodFlip,
    alert_undervalued: prefs.alertUndervalued,
  }).eq('id', user.id);
  if (error) return { error: 'We couldn’t save your settings. Please try again.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteAccountData(): Promise<void> {
  if (!authEnabled) redirect('/');
  const user = await getUser();
  if (!user) redirect('/');
  const supabase = (await createClient())!;
  await supabase.from('holdings').delete().eq('user_id', user.id);
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}
