'use client';

import { formatTimestamp } from '@/lib/utils';
import type { AuditLog } from '@/types';

interface Props {
  logs: AuditLog[];
}

export default function AuditLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">No changes recorded yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Who</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Field</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Old Value</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">New Value</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">When</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">{log.user?.full_name ?? log.user_id}</td>
              <td className="px-3 py-2 text-gray-600 font-mono">{log.field_changed ?? log.action}</td>
              <td className="px-3 py-2 text-red-500">{log.old_value ?? '—'}</td>
              <td className="px-3 py-2 text-green-600">{log.new_value ?? '—'}</td>
              <td className="px-3 py-2 text-gray-400">{formatTimestamp(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
