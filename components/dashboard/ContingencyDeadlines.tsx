'use client';

import Link from 'next/link';
import { formatDate, daysBetween } from '@/lib/utils';
import type { Client } from '@/types';
import { cn } from '@/lib/utils';

interface ContingencyRow {
  client: Client;
  type: 'Financing' | 'Appraisal';
  date: string;
}

interface Props {
  clients: Client[];
}

export default function ContingencyDeadlines({ clients }: Props) {
  const rows: ContingencyRow[] = [];

  for (const c of clients) {
    if (c.financing_contingency_date) {
      const d = daysBetween(c.financing_contingency_date);
      if (d !== null && d <= 14 && d >= 0) {
        rows.push({ client: c, type: 'Financing', date: c.financing_contingency_date });
      }
    }
    if (c.appraisal_contingency_date) {
      const d = daysBetween(c.appraisal_contingency_date);
      if (d !== null && d <= 14 && d >= 0) {
        rows.push({ client: c, type: 'Appraisal', date: c.appraisal_contingency_date });
      }
    }
  }

  rows.sort((a, b) => (daysBetween(a.date) ?? 99) - (daysBetween(b.date) ?? 99));

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
        No contingency deadlines in the next 14 days.
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
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Type</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Date</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Days Left</th>
              <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Agent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const days = daysBetween(row.date);
              const color =
                days !== null && days <= 3 ? 'text-red-600' :
                days !== null && days <= 7 ? 'text-amber-600' :
                'text-green-700';

              return (
                <tr key={`${row.client.id}-${row.type}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${row.client.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {row.client.first_name} {row.client.last_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      row.type === 'Financing' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    )}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{formatDate(row.date)}</td>
                  <td className={cn('px-3 py-3 font-semibold', color)}>
                    {days !== null ? `${days}d` : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{(row.client as Client & { agent?: { full_name: string } }).agent?.full_name ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
