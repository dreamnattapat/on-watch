import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Where Supabase sends people back after Google/Apple sign-in, email
// confirmation or a password reset. Exchanges the one-time code for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/today';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/today';

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // First-time Google/Apple users go through onboarding.
        const { data: user } = await supabase.auth.getUser();
        if (user.user && next === '/today') {
          const { data: profile } = await supabase.from('profiles').select('onboarded').eq('id', user.user.id).maybeSingle();
          if (profile && !profile.onboarded) return NextResponse.redirect(`${origin}/onboarding`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
