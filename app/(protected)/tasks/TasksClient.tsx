'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Task, Profile } from '@/types';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { isAfter, parseISO, isValid } from 'date-fns';

interface Props {
  currentProfile: Profile;
  myTasks: Task[];
  assignedByMe: Task[];
  allTasks: Task[];
  profiles: Profile[];
}

type TabId = 'mine' | 'assigned' | 'all';

export default function TasksClient({ currentProfile, myTasks: initMine, assignedByMe: initAssigned, allTasks: initAll, profiles }: Props) {
  const supabase = createSupabaseBrowserClient();

  const [activeTab, setActiveTab] = useState<TabId>('mine');
  const [myTasks, setMyTasks] = useState<Task[]>(initMine);
  const [assignedByMe, setAssignedByMe] = useState<Task[]>(initAssigned);
  const [allTasks, setAllTasks] = useState<Task[]>(initAll);
  const [showCreate, setShowCreate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    client_id: '',
    due_date: '',
  });

  const currentTasks = activeTab === 'mine' ? myTasks : activeTab === 'assigned' ? assignedByMe : allTasks;

  function isOverdue(task: Task) {
    if (!task.due_date || task.is_complete) return false;
    const d = parseISO(task.due_date);
    return isValid(d) && isAfter(new Date(), d);
  }

  async function handleCreateTask() {
    if (!createForm.title.trim() || !createForm.assigned_to) {
      toast.error('Title and assignee are required.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        assigned_to: createForm.assigned_to,
        assigned_by: currentProfile.id,
        client_id: createForm.client_id || null,
        due_date: createForm.due_date || null,
      })
      .select(`*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), assigner:profiles!tasks_assigned_by_fkey(id, full_name)`)
      .single();

    if (error || !data) {
      toast.error('Failed to create task.');
      setSaving(false);
      return;
    }

    // Notify assigned user
    await supabase.from('notifications').insert({
      user_id: createForm.assigned_to,
      type: 'task_assigned',
      message: `New task assigned to you by ${currentProfile.full_name}: "${createForm.title}"`,
      related_task_id: data.id,
    });

    toast.success('Task created and notification sent.');
    setSaving(false);
    setShowCreate(false);
    setCreateForm({ title: '', description: '', assigned_to: '', client_id: '', due_date: '' });

    const task = data as Task;
    if (createForm.assigned_to === currentProfile.id) {
      setMyTasks((prev) => [task, ...prev]);
    } else {
      setAssignedByMe((prev) => [task, ...prev]);
    }
    setAllTasks((prev) => [task, ...prev]);
  }

  async function handleCompleteTask() {
    if (!completeTarget) return;
    if (!completionNote.trim()) {
      toast.error('A completion note is required.');
      return;
    }
    setCompleting(true);
    const { error } = await supabase
      .from('tasks')
      .update({ is_complete: true, completion_note: completionNote.trim() })
      .eq('id', completeTarget.id);
    setCompleting(false);

    if (error) {
      toast.error('Failed to complete task.');
    } else {
      toast.success('Task marked complete.');
      const update = (tasks: Task[]) =>
        tasks.map((t) => t.id === completeTarget.id ? { ...t, is_complete: true, completion_note: completionNote } : t);
      setMyTasks(update);
      setAssignedByMe(update);
      setAllTasks(update);
      setCompleteTarget(null);
      setCompletionNote('');
    }
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'mine', label: 'My Tasks', count: myTasks.filter((t) => !t.is_complete).length },
    { id: 'assigned', label: 'Assigned by Me', count: assignedByMe.filter((t) => !t.is_complete).length },
    ...(currentProfile.role === 'admin' ? [{ id: 'all' as TabId, label: 'All Tasks', count: allTasks.filter((t) => !t.is_complete).length }] : []),
  ];

  const sorted = [...currentTasks].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    if (a.is_complete && !b.is_complete) return 1;
    if (!a.is_complete && b.is_complete) return -1;
    return 0;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Tasks</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white text-sm font-semibold rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${activeTab === tab.id ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-gray-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400">
          No tasks assigned to you.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => {
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 shadow-sm transition-colors ${
                  task.is_complete ? 'border-gray-100 opacity-60' : overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {task.is_complete ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    ) : overdue ? (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${task.is_complete ? 'line-through text-gray-400' : overdue ? 'text-red-700' : 'text-gray-800'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">
                          Assigned to: <span className="text-gray-600">{(task as Task & { assignee?: { full_name: string } }).assignee?.full_name ?? '—'}</span>
                        </span>
                        {task.due_date && (
                          <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}
                        {(task as Task & { client?: { first_name: string; last_name: string } }).client && (
                          <span className="text-xs text-gray-400">
                            Client: {(task as Task & { client?: { first_name: string; last_name: string } }).client?.first_name} {(task as Task & { client?: { first_name: string; last_name: string } }).client?.last_name}
                          </span>
                        )}
                      </div>
                      {task.is_complete && task.completion_note && (
                        <p className="text-xs text-green-700 mt-1 italic">Note: {task.completion_note}</p>
                      )}
                    </div>
                  </div>
                  {!task.is_complete && (
                    <button
                      onClick={() => { setCompleteTarget(task); setCompletionNote(''); }}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  placeholder="Task title…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assign To *</label>
                <select
                  value={createForm.assigned_to}
                  onChange={(e) => setCreateForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                >
                  <option value="">Select person…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateTask} disabled={saving} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {completeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Mark Task Complete</h2>
            <p className="text-sm text-gray-600 mb-4">&quot;{completeTarget.title}&quot;</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Completion Note *</label>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                placeholder="Describe what was done…"
              />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCompleteTask} disabled={completing} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {completing ? 'Saving…' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
