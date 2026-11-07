import { authEnabled } from './config';
import { createClient, getUser } from './supabase/server';

export interface Holding {
  ticker: string;
  shares: number | null;
  avgCost: number | null;
}

export interface Profile {
  firstName: string;
  briefTime: string;
  briefChannel: string;
  alertBigMove: boolean;
  alertEarnings: boolean;
  alertMoodFlip: boolean;
  alertUndervalued: boolean;
  onboarded: boolean;
}

// Used in demo mode (no Supabase configured) so every page can be explored.
export const DEMO_HOLDINGS: Holding[] = [
  { ticker: 'NVDA', shares: 40, avgCost: 120 },
  { ticker: 'AAPL', shares: 15, avgCost: 210 },
  { ticker: 'TSLA', shares: 10, avgCost: 450 },
  { ticker: 'META', shares: 8, avgCost: 520 },
  { ticker: 'AMZN', shares: 20, avgCost: 180 },
];

const DEMO_PROFILE: Profile = {
  firstName: 'there', briefTime: '07:00', briefChannel: 'email',
  alertBigMove: true, alertEarnings: true, alertMoodFlip: false, alertUndervalued: false, onboarded: true,
};

export async function getHoldings(): Promise<Holding[]> {
  if (!authEnabled) return DEMO_HOLDINGS;
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from('holdings').select('ticker, shares, avg_cost').order('created_at');
  return (data ?? []).map((r) => ({
    ticker: r.ticker as string,
    shares: r.shares == null ? null : Number(r.shares),
    avgCost: r.avg_cost == null ? null : Number(r.avg_cost),
  }));
}

export async function getProfile(): Promise<Profile | null> {
  if (!authEnabled) return DEMO_PROFILE;
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase!.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data) return { ...DEMO_PROFILE, firstName: '', onboarded: false };
  return {
    firstName: data.first_name ?? '',
    briefTime: data.brief_time,
    briefChannel: data.brief_channel,
    alertBigMove: data.alert_big_move,
    alertEarnings: data.alert_earnings,
    alertMoodFlip: data.alert_mood_flip,
    alertUndervalued: data.alert_undervalued,
    onboarded: data.onboarded,
  };
}
