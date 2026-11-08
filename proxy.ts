import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cleanSupabaseUrl, isAllowedEmail } from './lib/config';

// Refreshes the Supabase session on each request and keeps signed-out
// visitors out of the app pages. Does nothing when Supabase isn't configured
// (demo mode), so the site still works before accounts are set up.

// '/stock' also covers '/stocks' and the stock lookup pages.
const APP_PATHS = ['/today', '/stock', '/screener', '/settings', '/onboarding'];

export async function proxy(request: NextRequest) {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Private site: anyone not on the allow-list is signed out.
  if (data.user && !isAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.search = '?error=private';
    const out = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  }
  if (!data.user && path === '/') {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    return NextResponse.redirect(to);
  }
  if (!data.user && APP_PATHS.some((p) => path.startsWith(p))) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.searchParams.set('next', path);
    return NextResponse.redirect(to);
  }
  if (data.user && (path === '/' || path === '/login')) {
    const to = request.nextUrl.clone();
    to.pathname = '/today';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
