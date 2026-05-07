'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatTimestamp } from '@/lib/utils';
import type { Note, Profile } from '@/types';

interface Props {
  clientId: string;
  currentProfile: Profile;
  privateNotes: Note[];
  publicNotes: Note[];
  onNotesUpdated: (privateNotes: Note[], publicNotes: Note[]) => void;
}

export default function NotesPanel({
  clientId,
  currentProfile,
  privateNotes: initialPrivate,
  publicNotes: initialPublic,
  onNotesUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<'private' | 'public'>(
    currentProfile.role === 'agent' ? 'public' : 'private'
  );
  const [privateNotes, setPrivateNotes] = useState<Note[]>(initialPrivate);
  const [publicNotes, setPublicNotes] = useState<Note[]>(initialPublic);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('notes')
      .insert({
        client_id: clientId,
        author_id: currentProfile.id,
        content: newNote.trim(),
        note_type: activeTab,
      })
      .select('*, author:profiles!notes_author_id_fkey(id, full_name, role)')
      .single();

    setSaving(false);
    if (error) {
      toast.error('Failed to add note.');
      return;
    }

    if (activeTab === 'private') {
      const updated = [data as Note, ...privateNotes];
      setPrivateNotes(updated);
      onNotesUpdated(updated, publicNotes);
    } else {
      const updated = [data as Note, ...publicNotes];
      setPublicNotes(updated);
      onNotesUpdated(privateNotes, updated);
    }
    setNewNote('');
    toast.success('Note added.');
  }

  const canSeePrivate = currentProfile.role !== 'agent';

  const notesToShow = activeTab === 'private' ? privateNotes : publicNotes;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-gray-200">
        {canSeePrivate && (
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'private'
                ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F] bg-blue-50/30'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔒 Team Notes
          </button>
        )}
        <button
          onClick={() => setActiveTab('public')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'public'
              ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F] bg-blue-50/30'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💬 Client Notes
        </button>
      </div>

      {/* Add note */}
      <div className="p-4 border-b border-gray-100">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={`Add a ${activeTab === 'private' ? 'team' : 'client'} note…`}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={addNote}
            disabled={!newNote.trim() || saving}
            className="px-4 py-1.5 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {notesToShow.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No notes yet. Be the first to add one.
          </div>
        ) : (
          notesToShow.map((note) => (
            <div key={note.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">
                  {note.author?.full_name ?? 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">{formatTimestamp(note.created_at)}</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
