'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatTimestamp } from '@/lib/utils';
import type { Profile, Notification } from '@/types';

const typeIcon: Record<string, string> = {
  new_submission: '📋',
  task_assigned: '✅',
  task_reminder: '⏰',
  delete_request: '🗑️',
  stale_client: '🚩',
  client_updated: '📝',
};

const typeLabel: Record<string, string> = {
  new_submission: 'New Submission',
  task_assigned: 'Task Assigned',
  task_reminder: 'Task Reminder',
  delete_request: 'Delete Request',
  stale_client: 'Stale Client',
  client_updated: 'Client Updated',
};

interface Props {
  profile: Profile;
  notifications: Notification[];
}

export default function NotificationsClient({ profile, notifications: initialNotifs }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifs);
  const supabase = createSupabaseBrowserClient();

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read.');
  }

  async function markOneRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-[#1E3A5F] hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400">
          You&apos;re all caught up! ✅
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 border-b last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
            >
              <span className="text-xl mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {typeLabel[n.type] ?? n.type}
                  </span>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markOneRead(n.id)}
                  className="text-gray-300 hover:text-gray-500 mt-1 text-xs"
                  title="Mark as read"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
