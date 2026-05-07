'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Profile, Urgency, LoanStatus, LoanType } from '@/types';
import { LOAN_STATUSES } from '@/lib/constants';

export interface PipelineFilters {
  search: string;
  agentId: string;
  statuses: LoanStatus[];
  loaId: string;
  urgency: Urgency | '';
  loanType: LoanType | '';
  leadSource: string;
  closingFrom: string;
  closingTo: string;
}

const EMPTY_FILTERS: PipelineFilters = {
  search: '',
  agentId: '',
  statuses: [],
  loaId: '',
  urgency: '',
  loanType: '',
  leadSource: '',
  closingFrom: '',
  closingTo: '',
};

interface Props {
  filters: PipelineFilters;
  onChange: (filters: PipelineFilters) => void;
  agents: Profile[];
  loas: Profile[];
}

export default function PipelineFilterBar({ filters, onChange, agents, loas }: Props) {
  const [expanded, setExpanded] = useState(true);

  function set(partial: Partial<PipelineFilters>) {
    onChange({ ...filters, ...partial });
  }

  function toggleStatus(status: LoanStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    set({ statuses: next });
  }

  const hasFilters =
    filters.search || filters.agentId || filters.statuses.length > 0 ||
    filters.loaId || filters.urgency || filters.loanType ||
    filters.leadSource || filters.closingFrom || filters.closingTo;

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          Filters
          {hasFilters && (
            <span className="bg-[#1E3A5F] text-white text-xs rounded-full px-2 py-0.5">active</span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search client name…"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>

            {/* Urgency */}
            <select
              value={filters.urgency}
              onChange={(e) => set({ urgency: e.target.value as Urgency | '' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">All Urgencies</option>
              <option value="URGENT">URGENT</option>
              <option value="HOT">HOT</option>
              <option value="Cold">Cold</option>
            </select>

            {/* Loan Type */}
            <select
              value={filters.loanType}
              onChange={(e) => set({ loanType: e.target.value as LoanType | '' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">All Loan Types</option>
              <option value="purchase">Purchase</option>
              <option value="refinance">Refinance</option>
            </select>

            {/* Agent */}
            <select
              value={filters.agentId}
              onChange={(e) => set({ agentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>

            {/* LOA */}
            <select
              value={filters.loaId}
              onChange={(e) => set({ loaId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">All LOAs</option>
              {loas.map((l) => (
                <option key={l.id} value={l.id}>{l.full_name}</option>
              ))}
            </select>

            {/* Lead Source */}
            <input
              type="text"
              placeholder="Lead source…"
              value={filters.leadSource}
              onChange={(e) => set({ leadSource: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />

            {/* Closing From */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Closing from</label>
              <input
                type="date"
                value={filters.closingFrom}
                onChange={(e) => set({ closingFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>

            {/* Closing To */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Closing to</label>
              <input
                type="date"
                value={filters.closingTo}
                onChange={(e) => set({ closingTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
          </div>

          {/* Status multi-select */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {LOAN_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filters.statuses.includes(s)
                      ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
