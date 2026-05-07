'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import PipelineFilterBar, { type PipelineFilters } from '@/components/pipeline/PipelineFilters';
import PipelineTable from '@/components/pipeline/PipelineTable';
import type { Client, Profile } from '@/types';
import { parseISO, isValid } from 'date-fns';

interface Props {
  currentProfile: Profile;
  agents: Profile[];
  loas: Profile[];
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

export default function PipelineClient({ currentProfile, agents, loas }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PipelineFilters>(EMPTY_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const loadClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        agent:profiles!clients_agent_id_fkey(id, full_name, role),
        loa:profiles!clients_loa_id_fkey(id, full_name, role)
      `)
      .order('last_updated_at', { ascending: false });

    if (error) {
      toast.error('Failed to load clients.');
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filtered = clients.filter((c) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${c.first_name} ${c.last_name}`.toLowerCase().includes(q)) return false;
    }
    if (filters.urgency && c.urgency !== filters.urgency) return false;
    if (filters.loanType && c.loan_type !== filters.loanType) return false;
    if (filters.agentId && c.agent_id !== filters.agentId) return false;
    if (filters.loaId && c.loa_id !== filters.loaId) return false;
    if (filters.leadSource && !c.lead_source?.toLowerCase().includes(filters.leadSource.toLowerCase())) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
    if (filters.closingFrom && c.closing_date) {
      const d = parseISO(c.closing_date);
      if (isValid(d) && d < parseISO(filters.closingFrom)) return false;
    }
    if (filters.closingTo && c.closing_date) {
      const d = parseISO(c.closing_date);
      if (isValid(d) && d > parseISO(filters.closingTo)) return false;
    }
    return true;
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    const expected = `${deleteTarget.first_name} ${deleteTarget.last_name}`;
    if (deleteConfirmName.trim() !== expected) {
      toast.error('Name does not match. Please type the full client name.');
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete client.');
    } else {
      toast.success('Client deleted.');
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmName('');
    }
  }

  async function handleRequestDelete(client: Client) {
    const { error } = await supabase
      .from('clients')
      .update({ delete_requested: true, delete_requested_by: currentProfile.id })
      .eq('id', client.id);
    if (error) {
      toast.error('Failed to request deletion.');
    } else {
      toast.success('Deletion requested. Admin has been notified.');
      setClients((prev) =>
        prev.map((c) => c.id === client.id ? { ...c, delete_requested: true } : c)
      );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <PipelineFilterBar
        filters={filters}
        onChange={setFilters}
        agents={agents}
        loas={loas}
      />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          Loading pipeline…
        </div>
      ) : (
        <PipelineTable
          clients={filtered}
          role={currentProfile.role}
          onDelete={currentProfile.role === 'admin' ? setDeleteTarget : undefined}
          onRequestDelete={currentProfile.role !== 'admin' ? handleRequestDelete : undefined}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Client</h2>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. Type{' '}
              <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>{' '}
              to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type client full name…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
