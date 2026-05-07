import { getStatusBadgeClass } from '@/lib/constants';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  );
}
