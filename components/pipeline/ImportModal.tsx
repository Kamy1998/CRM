'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Upload, Download, X, CheckCircle } from 'lucide-react';
import type { Profile } from '@/types';

interface Props {
  onClose: () => void;
  onImported: () => void;
  agents: Profile[];
  loas: Profile[];
  currentUserId: string;
}

interface ParsedRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  urgency?: string;
  status?: string;
  lead_source?: string;
  loan_type?: string;
  loan_program?: string;
  property_price?: string;
  ltv?: string;
  date_received?: string;
  consultation_date?: string;
  closing_date?: string;
  financing_contingency_date?: string;
  appraisal_contingency_date?: string;
  group_text_sent?: string;
  email_intro_sent?: string;
  agent_name?: string;
  loa_name?: string;
  error?: string;
}

// Maps common Excel column names to our internal field names
const COLUMN_MAP: Record<string, string> = {
  'client name': 'full_name',
  'first name': 'first_name',
  'last name': 'last_name',
  'email': 'email',
  'phone': 'phone',
  'urgency': 'urgency',
  'status': 'status',
  'update': 'status',
  'lead source': 'lead_source',
  'loan type': 'loan_type',
  'loan program': 'loan_program',
  'property price': 'property_price',
  'ltv': 'ltv',
  'date received': 'date_received',
  'consultation date': 'consultation_date',
  'closing date': 'closing_date',
  'financing contingency': 'financing_contingency_date',
  'financing contingency date': 'financing_contingency_date',
  'appraisal contingency': 'appraisal_contingency_date',
  'appraisal contingency date': 'appraisal_contingency_date',
  'group text sent': 'group_text_sent',
  'group text with agent': 'group_text_sent',
  'email intro sent': 'email_intro_sent',
  'agent name': 'agent_name',
  'agent': 'agent_name',
  'loan officer assistant': 'loa_name',
  'loa': 'loa_name',
};

const VALID_STATUSES = [
  'Waiting to interview','Waiting on Application','Waiting on Documents',
  'Application completed','Pre-approved','Ratified','Submitted','Loan Setup',
  'Disclosed','Submitted to UW','Approved w/ Conditions','Re-submittal',
  'Pending CTC','CTC','Closed','On Hold','Conditionally approved','Waiting on App/Doc',
];

const VALID_URGENCIES = ['URGENT', 'HOT', 'Cold'];

function parseDate(val: string): string | undefined {
  if (!val || val.trim() === '') return undefined;
  // Try common formats
  const cleaned = val.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // MM/DD/YYYY
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (y.length === 4) return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Try native Date parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}

function normalizeRow(raw: Record<string, string>): ParsedRow {
  const mapped: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const normalized = key.toLowerCase().trim();
    const fieldName = COLUMN_MAP[normalized];
    if (fieldName) mapped[fieldName] = val?.trim() ?? '';
  }

  // Split "Client Name" into first/last
  if (mapped.full_name && !mapped.first_name) {
    const parts = mapped.full_name.trim().split(/\s+/);
    mapped.first_name = parts[0] ?? '';
    mapped.last_name = parts.slice(1).join(' ') || parts[0];
  }

  return {
    first_name: mapped.first_name ?? '',
    last_name: mapped.last_name ?? '',
    email: mapped.email || undefined,
    phone: mapped.phone || undefined,
    urgency: VALID_URGENCIES.includes(mapped.urgency) ? mapped.urgency : undefined,
    status: VALID_STATUSES.includes(mapped.status) ? mapped.status : 'Waiting to interview',
    lead_source: mapped.lead_source || undefined,
    loan_type: ['purchase','refinance'].includes(mapped.loan_type?.toLowerCase())
      ? mapped.loan_type.toLowerCase() : undefined,
    loan_program: mapped.loan_program || undefined,
    property_price: mapped.property_price || undefined,
    ltv: mapped.ltv || undefined,
    date_received: parseDate(mapped.date_received),
    consultation_date: parseDate(mapped.consultation_date),
    closing_date: parseDate(mapped.closing_date),
    financing_contingency_date: parseDate(mapped.financing_contingency_date),
    appraisal_contingency_date: parseDate(mapped.appraisal_contingency_date),
    group_text_sent: mapped.group_text_sent,
    email_intro_sent: mapped.email_intro_sent,
    agent_name: mapped.agent_name || undefined,
    loa_name: mapped.loa_name || undefined,
  };
}

function findProfile(name: string | undefined, profiles: Profile[]): string | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return profiles.find(p =>
    p.full_name?.toLowerCase().includes(lower) ||
    lower.includes(p.full_name?.toLowerCase() ?? '')
  )?.id;
}

const TEMPLATE_CSV = `first_name,last_name,email,phone,urgency,status,lead_source,loan_type,date_received,consultation_date,closing_date,agent_name,loa_name
John,Smith,john@email.com,555-1234,HOT,Pre-approved,Agent,purchase,2024-01-15,2024-01-20,2024-03-01,Agent Full Name,LOA Full Name
Jane,Doe,,555-5678,Cold,Waiting to interview,Referral,refinance,2024-02-01,,,,,`;

export default function ImportModal({ onClose, onImported, agents, loas, currentUserId }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '4ever_lending_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Record<string, string>[])
          .map(normalizeRow)
          .map(row => ({
            ...row,
            error: !row.first_name ? 'Missing first name' : undefined,
          }));
        setRows(parsed);
        setStep('preview');
      },
    });
  }

  async function handleImport() {
    setStep('importing');
    let success = 0;
    let failed = 0;

    const BATCH = 20;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).filter(r => !r.error);
      const records = batch.map(row => ({
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email ?? null,
        phone: row.phone ?? null,
        urgency: row.urgency ?? null,
        status: row.status ?? 'Waiting to interview',
        lead_source: row.lead_source ?? null,
        loan_type: row.loan_type ?? null,
        loan_program: row.loan_program ?? null,
        property_price: row.property_price ?? null,
        ltv: row.ltv ?? null,
        date_received: row.date_received ?? null,
        consultation_date: row.consultation_date ?? null,
        closing_date: row.closing_date ?? null,
        financing_contingency_date: row.financing_contingency_date ?? null,
        appraisal_contingency_date: row.appraisal_contingency_date ?? null,
        group_text_sent: ['true','yes','1'].includes(row.group_text_sent?.toLowerCase() ?? ''),
        email_intro_sent: ['true','yes','1'].includes(row.email_intro_sent?.toLowerCase() ?? ''),
        agent_id: findProfile(row.agent_name, agents) ?? null,
        loa_id: findProfile(row.loa_name, loas) ?? null,
        last_updated_by: currentUserId,
        submitted_by_agent: false,
        agent_submission_acknowledged: false,
        delete_requested: false,
      }));

      const { error } = await supabase.from('clients').insert(records);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
    }

    failed += rows.filter(r => r.error).length;
    setImportResults({ success, failed });
    setStep('done');
  }

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import Clients from CSV</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a <strong>.csv</strong> file. Export your Excel sheet as CSV first (File → Save As → CSV).
                  Column headers are flexible — common names like &quot;Client Name&quot;, &quot;Agent Name&quot;, &quot;Date Received&quot; are automatically recognized.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-[#1E3A5F] hover:underline mb-6"
                >
                  <Download className="w-4 h-4" />
                  Download CSV template
                </button>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#1E3A5F] transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Click to upload your CSV file</p>
                <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{fileName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {validRows.length} valid rows ready to import
                    {errorRows.length > 0 && ` · ${errorRows.length} rows will be skipped`}
                  </p>
                </div>
                <button
                  onClick={() => { setStep('upload'); setRows([]); }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Upload different file
                </button>
              </div>

              {errorRows.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Rows that will be skipped:</p>
                  {errorRows.map((r, i) => (
                    <p key={i} className="text-xs text-amber-600">Row {rows.indexOf(r) + 1}: {r.error}</p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Urgency</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Agent</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">LOA</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${row.error ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {row.first_name} {row.last_name}
                          {row.error && <span className="ml-1 text-red-500">({row.error})</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.status ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.urgency ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.agent_name ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.loa_name ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.closing_date ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    Showing first 50 of {rows.length} rows
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Importing {validRows.length} clients…</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <CheckCircle className="w-14 h-14 text-green-500" />
              <div>
                <p className="text-lg font-semibold text-gray-800">Import Complete</p>
                <p className="text-sm text-gray-500 mt-1">
                  {importResults.success} clients imported successfully
                  {importResults.failed > 0 && ` · ${importResults.failed} failed`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50"
              >
                Import {validRows.length} Clients
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={() => { onImported(); onClose(); }}
              className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a]"
            >
              Done — View Pipeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
