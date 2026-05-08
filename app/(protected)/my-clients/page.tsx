import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import MyClientsClient from './MyClientsClient';
import type { Client } from '@/types';

export default async function MyClientsPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'agent') {
    redirect('/pipeline');
  }

  // Fetch only agent's clients with limited columns
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, first_name, last_name, urgency, status, closing_date,
      financing_contingency_date, appraisal_contingency_date,
      last_updated_at, loan_type, submitted_by_agent, created_at,
      group_text_sent, email_intro_sent, delete_requested,
      agent_submission_acknowledged
    `)
    .eq('agent_id', session.user.id)
    .order('last_updated_at', { ascending: false });

  return (
    <MyClientsClient
      clients={(clients ?? []) as Partial<Client>[]}
    />
  );
}
