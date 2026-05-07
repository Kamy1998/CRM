import type { LoanStatus } from '@/types';

export const LOAN_STATUSES: LoanStatus[] = [
  'Waiting to interview',
  'Waiting on Application',
  'Waiting on Documents',
  'Application completed',
  'Pre-approved',
  'Ratified',
  'Submitted',
  'Loan Setup',
  'Disclosed',
  'Submitted to UW',
  'Approved w/ Conditions',
  'Re-submittal',
  'Pending CTC',
  'CTC',
  'Closed',
  'On Hold',
  'Conditionally approved',
  'Waiting on App/Doc',
];

export const STATUS_GROUPS: Record<string, LoanStatus[]> = {
  'pre-pipeline': ['Waiting to interview', 'Waiting on Application', 'Waiting on Documents', 'Application completed', 'Pre-approved', 'Ratified', 'Submitted'],
  'active': ['Loan Setup', 'Disclosed', 'Submitted to UW', 'Approved w/ Conditions', 'Re-submittal'],
  'near-closing': ['Pending CTC', 'CTC'],
  'closed': ['Closed', 'On Hold', 'Conditionally approved', 'Waiting on App/Doc'],
};

export const LEAD_SOURCE_SUGGESTIONS = [
  'Agent',
  'Repeat Client',
  'Friends',
  'Referral',
];

export const STATUS_GROUP_COLORS: Record<string, string> = {
  'pre-pipeline': 'bg-blue-100 text-blue-700 border-blue-200',
  'active': 'bg-orange-100 text-orange-700 border-orange-200',
  'near-closing': 'bg-green-100 text-green-700 border-green-200',
  'closed': 'bg-gray-100 text-gray-600 border-gray-200',
};

export function getStatusGroup(status: string): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if (statuses.includes(status as LoanStatus)) return group;
  }
  return 'closed';
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_GROUP_COLORS[getStatusGroup(status)] ?? STATUS_GROUP_COLORS['closed'];
}

export const URGENCY_BADGE_CLASSES: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border border-red-300',
  HOT: 'bg-orange-100 text-orange-700 border border-orange-300',
  Cold: 'bg-slate-100 text-slate-600 border border-slate-300',
};
