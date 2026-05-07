import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date().toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find incomplete tasks that need a reminder
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, assigned_to, last_reminder_sent')
    .eq('is_complete', false)
    .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${twentyFourHoursAgo}`);

  if (error) {
    console.error('task-reminders cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Create reminder notifications
  const notifications = tasks.map((task) => ({
    user_id: task.assigned_to,
    type: 'task_reminder',
    message: `Reminder: Task "${task.title}" is still open.`,
    related_task_id: task.id,
  }));

  const { error: notifError } = await supabase.from('notifications').insert(notifications);
  if (notifError) {
    console.error('task-reminders notif error:', notifError);
  }

  // Update last_reminder_sent
  const taskIds = tasks.map((t) => t.id);
  await supabase
    .from('tasks')
    .update({ last_reminder_sent: now })
    .in('id', taskIds);

  return NextResponse.json({ processed: tasks.length });
}
