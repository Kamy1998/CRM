'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import SummaryCards from '@/components/dashboard/SummaryCards';
import NeedsAttentionTable from '@/components/dashboard/NeedsAttentionTable';
import UpcomingClosings from '@/components/dashboard/UpcomingClosings';
import ContingencyDeadlines from '@/components/dashboard/ContingencyDeadlines';
import VolumeReport from '@/components/dashboard/VolumeReport';
import Link from 'next/link';
import type { Client, Profile, Notification } from '@/types';

const typeIcon: Record<string, string> = {
  new_submission: '📋',
  task_assigned: '✅',
  task_reminder: '⏰',
  delete_request: '🗑️',
  stale_client: '🚩',
  client_updated: '📝',
};

interface Props {
  profile: Profile;
  activeClients: Client[];
  staleClients: Client[];
  closingThisMonth: Client[];
  upcomingClosings: Client[];
  newSubmissions: Client[];
  openTaskCount: number;
  notifications: Notification[];
  allClients: Client[];
  allProfiles: Profile[];
}

export default function DashboardClient({
  profile,
  activeClients,
  staleClients,
  closingThisMonth,
  upcomingClosings,
  newSubmissions: initialSubmissions,
  openTaskCount,
  notifications: initialNotifications,
  allClients,
  allProfiles,
}: Props) {
  const supabase = createSupabaseBrowserClient();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [notifications, setNotifications] = useState(initialNotifications);

  async function acknowledgeSubmission(clientId: string) {
    const { error } = await supabase
      .from('clients')
      .update({ agent_submission_acknowledged: true })
      .eq('id', clientId);
    if (error) {
      toast.error('Failed to acknowledge submission.');
    } else {
      toast.success('Submission acknowledged.');
      setSubmissions((prev) => prev.filter((c) => c.id !== clientId));
    }
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read.');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {profile.full_name}</p>
      </div>

      {/* Section 1: Summary Cards */}
      <SummaryCards
        totalActive={activeClients.length}
        needsAttention={staleClients.length}
        closingThisMonth={closingThisMonth.length}
        openTasks={openTaskCount}
      />

      {/* Section 2: Needs Attention */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          🚨 Needs Attention
          {staleClients.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
              {staleClients.length}
            </span>
          )}
        </h2>
        <NeedsAttentionTable clients={staleClients} />
      </section>

      {/* Section 3: New Agent Submissions (Admin only) */}
      {profile.role === 'admin' && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            🆕 New Agent Submissions
            {submissions.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {submissions.length}
              </span>
            )}
          </h2>
          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
              No new agent submissions.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Client</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Loan Type</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Agent</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Submitted</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-[#1E3A5F]">
                          {c.first_name} {c.last_name}
                        </td>
                        <td className="px-3 py-3 text-gray-600 capitalize">{c.loan_type ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-600">{(c as Client & { agent?: { full_name: string } }).agent?.full_name ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{formatRelativeTime(c.created_at)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/clients/${c.id}`}
                              className="text-xs text-[#1E3A5F] hover:underline font-medium"
                            >
                              Review
                            </Link>
                            <button
                              onClick={() => acknowledgeSubmission(c.id)}
                              className="text-xs bg-[#1E3A5F] text-white px-2.5 py-1 rounded-lg hover:bg-[#162d4a] transition-colors"
                            >
                              Acknowledge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 4: Volume Report (Admin + LOA) */}
      {(profile.role === 'admin' || profile.role === 'loa') && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">📊 Volume Report</h2>
          <VolumeReport
            clients={activeClients}
            profiles={allProfiles}
            closedThisMonth={closingThisMonth}
          />
        </section>
      )}

      {/* Section 5: Notifications Panel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">🔔 Recent Notifications</h2>
          <div className="flex gap-3">
            <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-[#1E3A5F] hover:underline">
              Mark all as read
            </button>
            <Link href="/notifications" className="text-xs text-[#1E3A5F] hover:underline">
              View all →
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">You&apos;re all caught up! ✅</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                <span className="text-lg mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Section 6: Upcoming Closings */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">📅 Upcoming Closings (next 30 days)</h2>
        <UpcomingClosings clients={upcomingClosings} />
      </section>

      {/* Section 7: Contingency Deadlines */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">⏳ Contingency Deadlines (next 14 days)</h2>
        <ContingencyDeadlines clients={allClients} />
      </section>
    </div>
  );
}
