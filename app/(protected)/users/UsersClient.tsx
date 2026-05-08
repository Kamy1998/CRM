'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Profile, Role } from '@/types';
import { Search, Plus, Pencil, UserX, RefreshCw } from 'lucide-react';

interface Props {
  users: Profile[];
}

const roleBadge: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  loa: 'bg-blue-100 text-blue-700 border-blue-200',
  agent: 'bg-green-100 text-green-700 border-green-200',
};

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function UsersClient({ users: initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Profile | null>(null);

  const [addForm, setAddForm] = useState({ full_name: '', email: '', role: 'agent' as Role, password: '' });
  const [editForm, setEditForm] = useState({ full_name: '', role: 'agent' as Role, is_active: true, password: '' });

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleAddUser() {
    if (!addForm.full_name || !addForm.email || !addForm.password) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error || 'Failed to create user.');
    } else {
      toast.success('User created successfully.');
      setShowAdd(false);
      setAddForm({ full_name: '', email: '', role: 'agent', password: '' });
      router.refresh();
      // Add optimistic user
      setUsers((prev) => [{
        id: data.userId,
        email: addForm.email,
        full_name: addForm.full_name,
        role: addForm.role,
        is_active: true,
        created_at: new Date().toISOString(),
      }, ...prev]);
    }
  }

  async function handleEditUser() {
    if (!editUser) return;
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editUser.id,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
        password: editForm.password || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error || 'Failed to update user.');
    } else {
      toast.success('User updated.');
      setEditUser(null);
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? {
        ...u,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
      } : u));
    }
  }

  async function handleDeactivate(user: Profile) {
    setSaving(true);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, full_name: user.full_name, role: user.role, is_active: false }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Failed to deactivate user.');
    } else {
      toast.success('User deactivated.');
      setDeactivateTarget(null);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: false } : u));
    }
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setEditForm({ full_name: user.full_name, role: user.role, is_active: user.is_active, password: '' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Users</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white text-sm font-semibold rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="loa">LOA</option>
          <option value="agent">Agent</option>
        </select>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Name</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Email</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Role</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Status</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Created</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No users found.</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{user.full_name}</td>
                    <td className="px-3 py-3 text-gray-600">{user.email}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleBadge[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#1E3A5F] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {user.is_active && (
                          <button
                            onClick={() => setDeactivateTarget(user)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Deactivate"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input type="text" value={addForm.full_name} onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))} className="modal-input" />
            </Field>
            <Field label="Email">
              <input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} className="modal-input" />
            </Field>
            <Field label="Role">
              <select value={addForm.role} onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value as Role }))} className="modal-input">
                <option value="agent">Agent</option>
                <option value="loa">LOA</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Temporary Password">
              <div className="flex gap-2">
                <input type="text" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} className="modal-input flex-1" />
                <button
                  type="button"
                  onClick={() => setAddForm((p) => ({ ...p, password: generatePassword() }))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
                  title="Generate random password"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </Field>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAddUser} disabled={saving} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.full_name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input type="text" value={editForm.full_name} onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))} className="modal-input" />
            </Field>
            <Field label="Role">
              <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))} className="modal-input">
                <option value="agent">Agent</option>
                <option value="loa">LOA</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={editForm.is_active ? 'active' : 'inactive'} onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.value === 'active' }))} className="modal-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Reset Password (leave blank to keep)">
              <div className="flex gap-2">
                <input type="text" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} className="modal-input flex-1" placeholder="New password…" />
                <button
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, password: generatePassword() }))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </Field>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleEditUser} disabled={saving} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Deactivate Confirmation */}
      {deactivateTarget && (
        <Modal title="Deactivate User" onClose={() => setDeactivateTarget(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to deactivate <strong>{deactivateTarget.full_name}</strong>?
            They will no longer be able to log in.
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeactivateTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => handleDeactivate(deactivateTarget)} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .modal-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .modal-input:focus { border-color: #1E3A5F; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </div>
  );
}

function Modal({ title, children }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
