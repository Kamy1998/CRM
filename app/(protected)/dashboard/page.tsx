import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import DashboardClient from './DashboardClient';
import type { Profile, Client, Task, Notification } from '@/types';
import { startOfMonth, endOfMonth, addDays, formatISO } from 'date-fns';

export default async function DashboardPage() {
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

  const now = new Date();
  const monthStart = formatISO(startOfMonth(now), { representation: 'date' });
  const monthEnd = formatISO(endOfMonth(now), { representation: 'date' });
  const in30Days = formatISO(addDays(now, 30), { representation: 'date' });
  const today = formatISO(now, { representation: 'date' });

  // Build base client query depending on role
  let clientQuery = supabase
    .from('clients')
    .select(`*, agent:profiles!clients_agent_id_fkey(id, full_name, role), loa:profiles!clients_loa_id_fkey(id, full_name, role)`);

  if (profile.role === 'agent') {
    clientQuery = clientQuery.eq('agent_id', session.user.id);
  } else if (profile.role === 'loa') {
    // LOA sees all clients for their pipeline context
  }

  const { data: allClients } = await clientQuery;
  const clients = (allClients ?? []) as Client[];

  // Derived data
  const activeClients = clients.filter((c) => c.status !== 'Closed');

  const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const staleClients = activeClients.filter(
    (c) => c.last_updated_at < staleThreshold
  );

  const closingThisMonth = clients.filter(
    (c) => c.closing_date && c.closing_date >= monthStart && c.closing_date <= monthEnd
  );

  const upcomingClosings = clients.filter(
    (c) => c.closing_date && c.closing_date >= today && c.closing_date <= in30Days
  );

  // New agent submissions (admin only)
  let newSubmissions: Client[] = [];
  if (profile.role === 'admin') {
    const { data: submissions } = await supabase
      .from('clients')
      .select(`*, agent:profiles!clients_agent_id_fkey(id, full_name, role)`)
      .eq('submitted_by_agent', true)
      .eq('agent_submission_acknowledged', false)
      .order('created_at', { ascending: false });
    newSubmissions = (submissions ?? []) as Client[];
  }

  // Open tasks for current user
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .or(`assigned_to.eq.${session.user.id},assigned_by.eq.${session.user.id}`)
    .eq('is_complete', false);
  const openTasks = (tasksData ?? []) as Task[];

  // Notifications
  const { data: notificationsData } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(10);
  const notifications = (notificationsData ?? []) as Notification[];

  // All profiles for volume report
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true);

  return (
    <DashboardClient
      profile={profile as Profile}
      activeClients={activeClients}
      staleClients={staleClients}
      closingThisMonth={closingThisMonth}
      upcomingClosings={upcomingClosings}
      newSubmissions={newSubmissions}
      openTaskCount={openTasks.length}
      notifications={notifications}
      allClients={clients}
      allProfiles={(allProfiles ?? []) as Profile[]}
    />
  );
}
