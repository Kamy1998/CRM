import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          req.cookies.set({ name, value, ...options } as any);
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value, ...options } as any);
        },
        remove(name: string, options: Record<string, unknown>) {
          req.cookies.set({ name, value: '', ...options } as any);
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value: '', ...options } as any);
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/cron') || pathname.startsWith('/_next')) {
    return res;
  }

  // Not authenticated → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Check if user account is active
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=deactivated', req.url));
  }

  const role = profile.role;

  // Role-based route guards
  if (pathname.startsWith('/pipeline') && role === 'agent') {
    return NextResponse.redirect(new URL('/my-clients', req.url));
  }
  if (pathname.startsWith('/users') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (pathname.startsWith('/my-clients') && role !== 'agent') {
    return NextResponse.redirect(new URL('/pipeline', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
