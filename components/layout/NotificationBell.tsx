'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@/types';
import { Button } from '@/components/ui/button';

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotifications(data);
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  const typeIcon: Record<string, string> = {
    new_submission: '📋',
    task_assigned: '✅',
    task_reminder: '⏰',
    delete_request: '🗑️',
    stale_client: '🚩',
    client_updated: '📝',
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); loadNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm text-gray-800">Notifications</span>
              <button
                onClick={markAllRead}
                className="text-xs text-[#1E3A5F] hover:underline"
              >
                Mark all as read
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  You're all caught up! ✅
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <span className="text-lg mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        className="text-gray-400 hover:text-gray-600 text-xs mt-0.5"
                        title="Mark as read"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t">
              <a
                href="/notifications"
                className="block text-center text-xs text-[#1E3A5F] hover:underline py-1"
              >
                View all notifications →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
