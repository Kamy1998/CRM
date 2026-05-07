'use client';

import Link from 'next/link';
import { PlusCircle, Eye } from 'lucide-react';
import { formatDate, isStale } from '@/lib/utils';
import UrgencyBadge from '@/components/pipeline/UrgencyBadge';
import StatusBadge from '@/components/pipeline/StatusBadge';
import type { Client, Profile } from '@/types';

interface Props {
  profile: Profile;
  clients: Partial<Client>[];
}

export default function MyClientsClient({ profile, clients }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">My Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/my-clients/submit"
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#b8953f] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Submit New Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">You have no clients yet.</p>
          <Link
            href="/my-clients/submit"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white text-sm font-semibold rounded-lg hover:bg-[#b8953f] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Submit your first client
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Client</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Urgency</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Status</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Closing Date</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Fin. Contingency</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">App. Contingency</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Last Updated</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3"><UrgencyBadge urgency={c.urgency} /></td>
                    <td className="px-3 py-3"><StatusBadge status={c.status ?? ''} /></td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(c.closing_date)}</td>
                    <td className="px-3 py-3 text-gray-600">
                      {c.loan_type === 'purchase' ? formatDate(c.financing_contingency_date) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {c.loan_type === 'purchase' ? formatDate(c.appraisal_contingency_date) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(c.last_updated_at)}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/clients/${c.id}`}
                        className="p-1.5 inline-flex rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#1E3A5F] transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
