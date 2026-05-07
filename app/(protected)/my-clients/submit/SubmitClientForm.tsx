'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface Props {
  currentProfile: Profile;
}

export default function SubmitClientForm({ currentProfile }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    loan_type: 'purchase' as 'purchase' | 'refinance',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name are required.');
      return;
    }

    setSubmitting(true);

    // Create the client record
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        loan_type: form.loan_type,
        agent_id: currentProfile.id,
        status: 'Waiting to interview',
        urgency: 'Cold',
        submitted_by_agent: true,
        agent_submission_acknowledged: false,
        last_updated_by: currentProfile.id,
      })
      .select()
      .single();

    if (clientError || !newClient) {
      toast.error('Failed to submit client. Please try again.');
      setSubmitting(false);
      return;
    }

    // Add agent notes as public note if provided
    if (form.notes.trim()) {
      await supabase.from('notes').insert({
        client_id: newClient.id,
        author_id: currentProfile.id,
        content: form.notes.trim(),
        note_type: 'public',
      });
    }

    // Notify all admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: 'new_submission',
        message: `New client submitted by ${currentProfile.full_name}: ${form.first_name} ${form.last_name}`,
        related_client_id: newClient.id,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    setSubmitting(false);
    toast.success('Client submitted successfully!');
    router.push('/my-clients');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">First Name *</label>
          <input
            type="text"
            required
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Last Name *</label>
          <input
            type="text"
            required
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            placeholder="Last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          placeholder="client@example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          placeholder="(555) 555-5555"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Loan Type *</label>
        <div className="flex gap-3">
          {(['purchase', 'refinance'] as const).map((lt) => (
            <button
              key={lt}
              type="button"
              onClick={() => set('loan_type', lt)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                form.loan_type === lt
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {lt.charAt(0).toUpperCase() + lt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          placeholder="Any relevant notes about this client…"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 text-sm font-semibold bg-[#C9A84C] hover:bg-[#b8953f] text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Client'}
      </button>
    </form>
  );
}
