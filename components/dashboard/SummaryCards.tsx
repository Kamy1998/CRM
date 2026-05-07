'use client';

import { Users, AlertTriangle, Calendar, CheckSquare } from 'lucide-react';

interface Props {
  totalActive: number;
  needsAttention: number;
  closingThisMonth: number;
  openTasks: number;
}

export default function SummaryCards({ totalActive, needsAttention, closingThisMonth, openTasks }: Props) {
  const cards = [
    {
      label: 'Total Active Clients',
      value: totalActive,
      icon: <Users className="w-5 h-5" />,
      color: 'text-[#1E3A5F]',
      bg: 'bg-blue-50',
    },
    {
      label: 'Needs Attention',
      value: needsAttention,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: needsAttention > 0 ? 'text-red-600' : 'text-gray-600',
      bg: needsAttention > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      label: 'Closing This Month',
      value: closingThisMonth,
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Open Tasks',
      value: openTasks,
      icon: <CheckSquare className="w-5 h-5" />,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">{card.label}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <span className={card.color}>{card.icon}</span>
            </div>
          </div>
          <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
