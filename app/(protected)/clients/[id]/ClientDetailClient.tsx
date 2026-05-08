'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { LEAD_SOURCE_SUGGESTIONS } from '@/lib/constants';
import NotesPanel from '@/components/clients/NotesPanel';
import AuditLogTable from '@/components/clients/AuditLogTable';
import UnsavedChangesModal from '@/components/clients/UnsavedChangesModal';
import type { Client, Profile, Note, AuditLog, LoanStatus, Urgency, LoanType } from '@/types';

interface Props {
  client: Client;
  currentProfile: Profile;
  privateNotes: Note[];
  publicNotes: Note[];
  auditLogs: AuditLog[];
  agents: Profile[];
  loas: Profile[];
}

export default function ClientDetailClient({
  client: initialClient,
  currentProfile,
  privateNotes: initPrivate,
  publicNotes: initPublic,
  auditLogs,
  agents,
  loas,
}: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [client, setClient] = useState<Client>(initialClient);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [privateNotes, setPrivateNotes] = useState<Note[]>(initPrivate);
  const [publicNotes, setPublicNotes] = useState<Note[]>(initPublic);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = currentProfile.role === 'admin' ||
    (currentProfile.role === 'loa' && client.loa_id === currentProfile.id);

  function field<K extends keyof Client>(key: K, value: Client[K]) {
    setClient((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  // Warn on browser unload
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        urgency: client.urgency,
        status: client.status,
        lead_source: client.lead_source,
        loan_type: client.loan_type,
        loan_program: client.loan_program,
        property_price: client.property_price,
        ltv: client.ltv,
        agent_id: currentProfile.role === 'admin' ? client.agent_id : undefined,
        loa_id: currentProfile.role === 'admin' ? client.loa_id : undefined,
        date_received: client.date_received || null,
        consultation_date: client.consultation_date || null,
        closing_date: client.closing_date || null,
        financing_contingency_date: client.loan_type === 'purchase' ? (client.financing_contingency_date || null) : null,
        appraisal_contingency_date: client.loan_type === 'purchase' ? (client.appraisal_contingency_date || null) : null,
        group_text_sent: client.group_text_sent,
        email_intro_sent: client.email_intro_sent,
        last_updated_by: currentProfile.id,
      })
      .eq('id', client.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save. Please try again.');
    } else {
      toast.success('Client saved successfully.');
      setIsDirty(false);
    }
  }

  async function handleDelete() {
    const expected = `${client.first_name} ${client.last_name}`;
    if (deleteConfirm.trim() !== expected) {
      toast.error('Name does not match.');
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete client.');
    } else {
      toast.success('Client deleted.');
      router.push('/pipeline');
    }
  }

  async function handleRequestDelete() {
    const { error } = await supabase
      .from('clients')
      .update({ delete_requested: true, delete_requested_by: currentProfile.id })
      .eq('id', client.id);
    if (error) {
      toast.error('Failed to request deletion.');
    } else {
      toast.success('Deletion requested. Admin has been notified.');
      setClient((prev) => ({ ...prev, delete_requested: true }));
    }
  }

  const isReadOnly = !canEdit;

  return (
    <div>
      <UnsavedChangesModal
        open={showUnsaved}
        onSave={() => { setShowUnsaved(false); handleSave().then(() => { if (pendingNav) router.push(pendingNav); }); }}
        onDiscard={() => { setIsDirty(false); setShowUnsaved(false); if (pendingNav) router.push(pendingNav); }}
        onCancel={() => { setShowUnsaved(false); setPendingNav(null); }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">
            {client.first_name} {client.last_name}
          </h1>
          {client.delete_requested && (
            <span className="inline-block mt-1 text-xs bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded-full">
              ⚠️ Deletion Requested
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : isDirty ? 'Save Changes' : 'Saved'}
            </button>
          )}
          {currentProfile.role === 'admin' ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Client
            </button>
          ) : (
            !client.delete_requested && (
              <button
                onClick={handleRequestDelete}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Request Deletion
              </button>
            )
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Client form */}
        <div className="xl:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Client Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name">
                <input
                  type="text"
                  value={client.first_name}
                  onChange={(e) => field('first_name', e.target.value)}
                  disabled={isReadOnly}
                  className="field-input"
                />
              </FormField>
              <FormField label="Last Name">
                <input
                  type="text"
                  value={client.last_name}
                  onChange={(e) => field('last_name', e.target.value)}
                  disabled={isReadOnly}
                  className="field-input"
                />
              </FormField>
              {currentProfile.role !== 'agent' && (
                <>
                  <FormField label="Email">
                    <input
                      type="email"
                      value={client.email ?? ''}
                      onChange={(e) => field('email', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                  <FormField label="Phone">
                    <input
                      type="tel"
                      value={client.phone ?? ''}
                      onChange={(e) => field('phone', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                </>
              )}
              <FormField label="Urgency">
                <select
                  value={client.urgency ?? ''}
                  onChange={(e) => field('urgency', e.target.value as Urgency)}
                  disabled={isReadOnly}
                  className="field-input"
                >
                  <option value="">Select…</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HOT">HOT</option>
                  <option value="Cold">Cold</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select
                  value={client.status}
                  onChange={(e) => field('status', e.target.value as LoanStatus)}
                  disabled={isReadOnly}
                  className="field-input"
                >
                  <optgroup label="── Pre-Pipeline ──">
                    {['Waiting to interview','Waiting on Application','Waiting on Documents','Application completed','Pre-approved','Ratified','Submitted'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Active Loan Process ──">
                    {['Loan Setup','Disclosed','Submitted to UW','Approved w/ Conditions','Re-submittal','Pending CTC','CTC','Closed'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Other ──">
                    {['On Hold','Conditionally approved','Waiting on App/Doc'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                </select>
              </FormField>
              <FormField label="Loan Type">
                <select
                  value={client.loan_type ?? ''}
                  onChange={(e) => field('loan_type', e.target.value as LoanType)}
                  disabled={isReadOnly}
                  className="field-input"
                >
                  <option value="">Select…</option>
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                </select>
              </FormField>
              {currentProfile.role !== 'agent' && (
                <FormField label="Lead Source">
                  <input
                    type="text"
                    list="lead-sources"
                    value={client.lead_source ?? ''}
                    onChange={(e) => field('lead_source', e.target.value)}
                    disabled={isReadOnly}
                    className="field-input"
                    placeholder="e.g. Agent, Referral…"
                  />
                  <datalist id="lead-sources">
                    {LEAD_SOURCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </FormField>
              )}
              {currentProfile.role !== 'agent' && (
                <>
                  <FormField label="Loan Program">
                    <input
                      type="text"
                      value={client.loan_program ?? ''}
                      onChange={(e) => field('loan_program', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                  <FormField label="Property Price">
                    <input
                      type="text"
                      value={client.property_price ?? ''}
                      onChange={(e) => field('property_price', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                  <FormField label="LTV">
                    <input
                      type="text"
                      value={client.ltv ?? ''}
                      onChange={(e) => field('ltv', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                </>
              )}
              {currentProfile.role === 'admin' && (
                <>
                  <FormField label="Agent Assigned">
                    <select
                      value={client.agent_id ?? ''}
                      onChange={(e) => field('agent_id', e.target.value || undefined)}
                      className="field-input"
                    >
                      <option value="">— None —</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="LOA Assigned">
                    <select
                      value={client.loa_id ?? ''}
                      onChange={(e) => field('loa_id', e.target.value || undefined)}
                      className="field-input"
                    >
                      <option value="">— None —</option>
                      {loas.map((l) => (
                        <option key={l.id} value={l.id}>{l.full_name}</option>
                      ))}
                    </select>
                  </FormField>
                </>
              )}
              {currentProfile.role !== 'agent' && (
                <FormField label="Date Received">
                  <input
                    type="date"
                    value={client.date_received ?? ''}
                    onChange={(e) => field('date_received', e.target.value)}
                    disabled={isReadOnly}
                    className="field-input"
                  />
                </FormField>
              )}
              <FormField label="Consultation Date">
                <input
                  type="date"
                  value={client.consultation_date ?? ''}
                  onChange={(e) => field('consultation_date', e.target.value)}
                  disabled={isReadOnly}
                  className="field-input"
                />
              </FormField>
              <FormField label="Closing Date">
                <input
                  type="date"
                  value={client.closing_date ?? ''}
                  onChange={(e) => field('closing_date', e.target.value)}
                  disabled={isReadOnly}
                  className="field-input"
                />
              </FormField>
              {client.loan_type === 'purchase' && (
                <>
                  <FormField label="Financing Contingency">
                    <input
                      type="date"
                      value={client.financing_contingency_date ?? ''}
                      onChange={(e) => field('financing_contingency_date', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                  <FormField label="Appraisal Contingency">
                    <input
                      type="date"
                      value={client.appraisal_contingency_date ?? ''}
                      onChange={(e) => field('appraisal_contingency_date', e.target.value)}
                      disabled={isReadOnly}
                      className="field-input"
                    />
                  </FormField>
                </>
              )}
            </div>

            {currentProfile.role !== 'agent' && (
              <div className="mt-4 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={client.group_text_sent}
                    onChange={(e) => field('group_text_sent', e.target.checked)}
                    disabled={isReadOnly}
                    className="rounded"
                  />
                  Group Text Sent
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={client.email_intro_sent}
                    onChange={(e) => field('email_intro_sent', e.target.checked)}
                    disabled={isReadOnly}
                    className="rounded"
                  />
                  Email Intro Sent
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Right: Notes + Audit Log */}
        <div className="xl:col-span-2 space-y-5">
          <NotesPanel
            clientId={client.id}
            currentProfile={currentProfile}
            privateNotes={privateNotes}
            publicNotes={publicNotes}
            onNotesUpdated={(p, pub) => { setPrivateNotes(p); setPublicNotes(pub); }}
          />

          {(currentProfile.role === 'admin' || currentProfile.role === 'loa') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700">📋 Audit Log</h3>
                {currentProfile.role !== 'admin' && (
                  <span className="text-xs text-gray-400">(your assigned clients)</span>
                )}
              </div>
              <AuditLogTable logs={auditLogs} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Client</h2>
            <p className="text-sm text-gray-600 mb-4">
              This cannot be undone. Type{' '}
              <strong>{client.first_name} {client.last_name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type client name…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #111827;
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: #1E3A5F;
          box-shadow: 0 0 0 3px rgba(30,58,95,0.1);
        }
        .field-input:disabled {
          background: #f9fafb;
          color: #6b7280;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
