'use client';

import { getStatusGroup } from '@/lib/constants';
import type { Client, Profile } from '@/types';

interface Props {
  clients: Client[];
  profiles: Profile[];
  closedThisMonth: Client[];
}

export default function VolumeReport({ clients, profiles, closedThisMonth }: Props) {
  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const c of clients) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
  }

  // Count by urgency
  const urgencyCounts = { URGENT: 0, HOT: 0, Cold: 0 };
  for (const c of clients) {
    if (c.urgency) urgencyCounts[c.urgency] = (urgencyCounts[c.urgency] ?? 0) + 1;
  }

  // Per-agent breakdown
  const agentCounts: Record<string, { name: string; count: number }> = {};
  for (const c of clients) {
    if (c.agent_id) {
      if (!agentCounts[c.agent_id]) {
        const agentProfile = profiles.find((p) => p.id === c.agent_id);
        agentCounts[c.agent_id] = { name: agentProfile?.full_name ?? 'Unknown', count: 0 };
      }
      agentCounts[c.agent_id].count++;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Urgency breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">By Urgency</h3>
        <div className="space-y-2">
          {Object.entries(urgencyCounts).map(([u, count]) => (
            <div key={u} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{u}</span>
              <span className="text-sm font-semibold text-gray-800">{count}</span>
            </div>
          ))}
        </div>
        {closedThisMonth.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Closed This Month</p>
            <p className="text-2xl font-bold text-green-700">{closedThisMonth.length}</p>
          </div>
        )}
      </div>

      {/* Per-agent breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Clients by Agent</h3>
        {Object.keys(agentCounts).length === 0 ? (
          <p className="text-sm text-gray-400">No agent assignments.</p>
        ) : (
          <div className="space-y-2">
            {Object.values(agentCounts)
              .sort((a, b) => b.count - a.count)
              .map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{a.name}</span>
                  <span className="text-sm font-semibold text-gray-800 ml-2">{a.count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Status counts */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Funnel</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-xs text-gray-600 truncate">{status}</span>
                <span className="text-xs font-semibold text-gray-800 ml-2">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
