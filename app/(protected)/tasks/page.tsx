import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import TasksClient from './TasksClient';
import type { Profile, Task } from '@/types';

export default async function TasksPage() {
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

  const userId = session.user.id;

  const [myTasksResult, assignedByMeResult, allTasksResult, profilesResult] = await Promise.all([
    supabase
      .from('tasks')
      .select(`*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), assigner:profiles!tasks_assigned_by_fkey(id, full_name), client:clients(id, first_name, last_name)`)
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true, nullsFirst: false }),

    supabase
      .from('tasks')
      .select(`*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), assigner:profiles!tasks_assigned_by_fkey(id, full_name), client:clients(id, first_name, last_name)`)
      .eq('assigned_by', userId)
      .neq('assigned_to', userId)
      .order('due_date', { ascending: true, nullsFirst: false }),

    profile.role === 'admin'
      ? supabase
          .from('tasks')
          .select(`*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), assigner:profiles!tasks_assigned_by_fkey(id, full_name), client:clients(id, first_name, last_name)`)
          .order('due_date', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),

    supabase.from('profiles').select('id, full_name, role').eq('is_active', true),
  ]);

  return (
    <TasksClient
      currentProfile={profile as Profile}
      myTasks={(myTasksResult.data ?? []) as Task[]}
      assignedByMe={(assignedByMeResult.data ?? []) as Task[]}
      allTasks={(allTasksResult.data ?? []) as Task[]}
      profiles={(profilesResult.data ?? []) as Profile[]}
    />
  );
}
