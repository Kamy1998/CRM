import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import ClientDetailClient from './ClientDetailClient';
import type { Profile, Client, Note, AuditLog } from '@/types';

interface Props {
  params: { id: string };
}

export default async function ClientDetailPage({ params }: Props) {
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

  // Fetch client with joined profiles
  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      agent:profiles!clients_agent_id_fkey(id, full_name, role, email),
      loa:profiles!clients_loa_id_fkey(id, full_name, role, email)
    `)
    .eq('id', params.id)
    .single();

  if (error || !client) notFound();

  // Fetch notes based on role
  let notesQuery = supabase
    .from('notes')
    .select('*, author:profiles!notes_author_id_fkey(id, full_name, role)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });

  const { data: allNotes } = await notesQuery;
  const notes = (allNotes ?? []) as Note[];

  // Separate notes by type (agents only get public)
  const privateNotes = profile.role === 'agent' ? [] : notes.filter((n) => n.note_type === 'private');
  const publicNotes = notes.filter((n) => n.note_type === 'public');

  // Audit log (admin only)
  let auditLogs: AuditLog[] = [];
  if (profile.role === 'admin') {
    const { data: logs } = await supabase
      .from('audit_log')
      .select('*, user:profiles!audit_log_user_id_fkey(id, full_name, role)')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false });
    auditLogs = (logs ?? []) as AuditLog[];
  } else if (profile.role === 'loa') {
    const { data: logs } = await supabase
      .from('audit_log')
      .select('*, user:profiles!audit_log_user_id_fkey(id, full_name, role)')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false });
    auditLogs = (logs ?? []) as AuditLog[];
  }

  // Agents and LOAs for assignment dropdowns (admin only)
  const { data: allAgents } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('role', 'agent')
    .eq('is_active', true);

  const { data: allLoas } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('role', 'loa')
    .eq('is_active', true);

  return (
    <ClientDetailClient
      client={client as Client}
      currentProfile={profile as Profile}
      privateNotes={privateNotes}
      publicNotes={publicNotes}
      auditLogs={auditLogs}
      agents={(allAgents ?? []) as Profile[]}
      loas={(allLoas ?? []) as Profile[]}
    />
  );
}
