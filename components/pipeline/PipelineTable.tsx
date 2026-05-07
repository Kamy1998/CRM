'use client';

import Link from 'next/link';
import { Flag, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Client, Role } from '@/types';
import { isStale, formatDate, formatRelativeTime } from '@/lib/utils';
import UrgencyBadge from './UrgencyBadge';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface Props {
  clients: (Client & { lastNoteSnippet?: string })[];
  role: Role;
  onDelete?: (client: Client) => void;
  onRequestDelete?: (client: Client) => void;
}

export default function PipelineTable({ clients, role, onDelete, onRequestDelete }: Props) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
        No clients match your filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-8 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">🚩</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Update</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">LOA</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead Source</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Received</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Consult</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Closing</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fin. Cont.</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">App. Cont.</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const stale = isStale(client.last_updated_at) && client.status !== 'Closed';
              return (
                <tr
                  key={client.id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    stale && 'border-l-2 border-l-red-400'
                  )}
                >
                  <td className="px-3 py-3">
                    {stale && <Flag className="w-4 h-4 text-red-500" />}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-[#1E3A5F] hover:underline"
                    >
                      {client.first_name} {client.last_name}
                    </Link>
                    {client.delete_requested && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        ⚠️ Deletion Requested
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <UrgencyBadge urgency={client.urgency} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-3 py-3 max-w-[180px]">
                    {client.lastNoteSnippet ? (
                      <div>
                        <p className="text-gray-700 text-xs truncate">{client.lastNoteSnippet}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{formatRelativeTime(client.last_updated_at)}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">{formatRelativeTime(client.last_updated_at)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {client.agent?.full_name ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {client.loa?.full_name ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{client.lead_source ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(client.date_received)}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(client.consultation_date)}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(client.closing_date)}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {client.loan_type === 'purchase' ? formatDate(client.financing_contingency_date) : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {client.loan_type === 'purchase' ? formatDate(client.appraisal_contingency_date) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/clients/${client.id}`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#1E3A5F] transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(role === 'admin' || role === 'loa') && (
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#1E3A5F] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      {role === 'admin' && onDelete && (
                        <button
                          onClick={() => onDelete(client)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
