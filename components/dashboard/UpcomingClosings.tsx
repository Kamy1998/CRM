'use client';

import Link from 'next/link';
import { formatDate, daysBetween } from '@/lib/utils';
import StatusBadge from '@/components/pipeline/StatusBadge';
import type { Client } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  clients: Client[];
}

export default function UpcomingClosings({ clients }: Props) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
        No upcoming closings in the next 30 days.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Client</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Closing Date</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Days Left</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Agent</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const days = daysBetween(c.closing_date);
              const urgencyColor =
                days !== null && days < 7
                  ? 'text-red-600 bg-red-50'
                  : days !== null && days < 14
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-green-700 bg-green-50';

              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{formatDate(c.closing_date)}</td>
                  <td className="px-3 py-3">
                    {days !== null ? (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', urgencyColor)}>
                        {days}d
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{(c as any).agent?.full_name ?? '—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
