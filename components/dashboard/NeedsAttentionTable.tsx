'use client';

import Link from 'next/link';
import { Flag } from 'lucide-react';
import { formatRelativeTime, isStale } from '@/lib/utils';
import UrgencyBadge from '@/components/pipeline/UrgencyBadge';
import StatusBadge from '@/components/pipeline/StatusBadge';
import type { Client } from '@/types';
import { differenceInHours, parseISO } from 'date-fns';

interface Props {
  clients: Client[];
}

export default function NeedsAttentionTable({ clients }: Props) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
        Nothing here — you're all caught up! ✅
      </div>
    );
  }

  const sorted = [...clients].sort(
    (a, b) => parseISO(a.last_updated_at).getTime() - parseISO(b.last_updated_at).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-8 px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">🚩</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Client</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Urgency</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Status</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Agent</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Days Since Update</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const hours = differenceInHours(new Date(), parseISO(c.last_updated_at));
              const days = Math.floor(hours / 24);
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-red-50/40 transition-colors border-l-2 border-l-red-400">
                  <td className="px-3 py-3"><Flag className="w-4 h-4 text-red-500" /></td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3"><UrgencyBadge urgency={c.urgency} /></td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3 text-gray-600">{(c as any).agent?.full_name ?? '—'}</td>
                  <td className="px-3 py-3 text-red-600 font-medium">
                    {days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
