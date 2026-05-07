import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import type { Profile } from '@/types';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/login?error=deactivated');
  }

  return <AppLayout profile={profile as Profile}>{children}</AppLayout>;
}
