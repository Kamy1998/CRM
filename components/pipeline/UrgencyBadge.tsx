import { URGENCY_BADGE_CLASSES } from '@/lib/constants';
import type { Urgency } from '@/types';

export default function UrgencyBadge({ urgency }: { urgency?: Urgency | null }) {
  if (!urgency) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${URGENCY_BADGE_CLASSES[urgency] ?? ''}`}>
      {urgency}
    </span>
  );
}
