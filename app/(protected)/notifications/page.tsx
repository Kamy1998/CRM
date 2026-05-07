import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import NotificationsClient from './NotificationsClient';
import type { Profile, Notification } from '@/types';

export default async function NotificationsPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <NotificationsClient
      profile={profile as Profile}
      notifications={(notifications ?? []) as Notification[]}
    />
  );
}
