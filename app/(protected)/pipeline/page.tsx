import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import PipelineClient from './PipelineClient';
import type { Profile } from '@/types';

export default async function PipelinePage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role === 'agent') {
    redirect('/my-clients');
  }

  const [{ data: agents }, { data: loas }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('role', 'agent').eq('is_active', true),
    supabase.from('profiles').select('id, full_name, role').eq('role', 'loa').eq('is_active', true),
  ]);

  return (
    <PipelineClient
      currentProfile={profile as Profile}
      agents={(agents ?? []) as Profile[]}
      loas={(loas ?? []) as Profile[]}
    />
  );
}
