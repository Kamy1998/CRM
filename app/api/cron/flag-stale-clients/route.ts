import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find stale clients (not updated in 48hrs, not Closed)
  const { data: staleClients, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, loa_id')
    .neq('status', 'Closed')
    .lt('last_updated_at', fortyEightHoursAgo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!staleClients || staleClients.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Get all admin users
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  const adminIds = (admins ?? []).map((a) => a.id);

  // Check which clients already got a notification in the last 24hrs (to avoid spam)
  const clientIds = staleClients.map((c) => c.id);
  const { data: recentNotifs } = await supabase
    .from('notifications')
    .select('related_client_id')
    .eq('type', 'stale_client')
    .gt('created_at', oneDayAgo)
    .in('related_client_id', clientIds);

  const alreadyNotified = new Set((recentNotifs ?? []).map((n) => n.related_client_id));

  const notifications: object[] = [];

  for (const client of staleClients) {
    if (alreadyNotified.has(client.id)) continue;

    const msg = `Client "${client.first_name} ${client.last_name}" hasn't been updated in 48+ hours.`;

    // Notify admins
    for (const adminId of adminIds) {
      notifications.push({
        user_id: adminId,
        type: 'stale_client',
        message: msg,
        related_client_id: client.id,
      });
    }

    // Notify assigned LOA
    if (client.loa_id && !adminIds.includes(client.loa_id)) {
      notifications.push({
        user_id: client.loa_id,
        type: 'stale_client',
        message: msg,
        related_client_id: client.id,
      });
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  return NextResponse.json({ processed: notifications.length });
}
