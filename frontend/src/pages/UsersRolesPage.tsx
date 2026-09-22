import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type Role = { id: number; name: string; description: string | null; permissions: string | null; active: boolean }
type UserAccount = { id: number; fullName: string; email: string; roleId: number | null; roleName: string | null; status: string }
type UserForm = { fullName: string; email: string; password: string; roleId: string; status: string }
type RoleForm = { name: string; description: string; permissions: string; active: boolean }
const emptyUser: UserForm = { fullName: '', email: '', password: '', roleId: '', status: 'ACTIVE' }
const emptyRole: RoleForm = { name: '', description: '', permissions: '', active: true }

export default function UsersRolesPage() {
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userForm, setUserForm] = useState<UserForm>(emptyUser)
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRole)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [modal, setModal] = useState<'user' | 'role' | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true); setError('')
    Promise.all([apiGet<UserAccount[]>('/api/users'), apiGet<Role[]>('/api/roles')])
      .then(([userData, roleData]) => { setUsers(userData); setRoles(roleData) })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load users and roles'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openUserCreate = () => { setEditingUser(null); setUserForm(emptyUser); setModal('user'); setError('') }
  const openUserEdit = (user: UserAccount) => { setEditingUser(user); setUserForm({ fullName: user.fullName, email: user.email, password: '', roleId: user.roleId?.toString() ?? '', status: user.status }); setModal('user'); setError('') }
  const openRoleCreate = () => { setEditingRole(null); setRoleForm(emptyRole); setModal('role'); setError('') }
  const openRoleEdit = (role: Role) => { setEditingRole(role); setRoleForm({ name: role.name, description: role.description ?? '', permissions: role.permissions ?? '', active: role.active }); setModal('role'); setError('') }
  const closeModal = () => { setModal(null); setEditingUser(null); setEditingRole(null) }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...userForm, roleId: userForm.roleId ? Number(userForm.roleId) : null }
      const saved = editingUser ? await apiPut<UserAccount>(`/api/users/${editingUser.id}`, payload) : await apiPost<UserAccount>('/api/users', payload)
      setUsers((current) => editingUser ? current.map((user) => user.id === saved.id ? saved : user) : [saved, ...current]); closeModal()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save user') } finally { setSaving(false) }
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const saved = editingRole ? await apiPut<Role>(`/api/roles/${editingRole.id}`, roleForm) : await apiPost<Role>('/api/roles', roleForm)
      setRoles((current) => editingRole ? current.map((role) => role.id === saved.id ? saved : role) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name))); closeModal()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save role') } finally { setSaving(false) }
  }

  async function removeUser(user: UserAccount) { if (!window.confirm(`Delete ${user.fullName}?`)) return; try { await apiDelete(`/api/users/${user.id}`); setUsers((current) => current.filter((item) => item.id !== user.id)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete user') } }
  async function removeRole(role: Role) { if (!window.confirm(`Delete ${role.name}?`)) return; try { await apiDelete(`/api/roles/${role.id}`); setRoles((current) => current.filter((item) => item.id !== role.id)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete role') } }

  return <div className="space-y-6 py-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-muted">Control workspace access and role permissions.</p><button onClick={tab === 'users' ? openUserCreate : openRoleCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"><Plus size={16} />{tab === 'users' ? 'Add user' : 'Add role'}</button></div><div className="flex gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-soft"><button onClick={() => setTab('users')} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${tab === 'users' ? 'bg-teal-600 text-white' : 'text-muted hover:bg-teal-50 hover:text-teal-700'}`}><UserRound size={15} /> Users</button><button onClick={() => setTab('roles')} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold ${tab === 'roles' ? 'bg-teal-600 text-white' : 'text-muted hover:bg-teal-50 hover:text-teal-700'}`}><ShieldCheck size={15} /> Roles</button></div>{error && !modal && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}{loading ? <LoadingState /> : error && users.length === 0 && roles.length === 0 ? <ErrorState message={error} onRetry={load} /> : tab === 'users' ? <UsersTable users={users} onEdit={openUserEdit} onDelete={removeUser} /> : <RolesTable roles={roles} onEdit={openRoleEdit} onDelete={removeRole} />}{modal === 'user' && <UserModal editing={editingUser} form={userForm} setForm={setUserForm} roles={roles} saving={saving} error={error} onClose={closeModal} onSave={saveUser} />}{modal === 'role' && <RoleModal editing={editingRole} form={roleForm} setForm={setRoleForm} saving={saving} error={error} onClose={closeModal} onSave={saveRole} />}</div>
}

function UsersTable({ users, onEdit, onDelete }: { users: UserAccount[]; onEdit: (user: UserAccount) => void; onDelete: (user: UserAccount) => void }) {
  if (users.length === 0) return <EmptyState title="No users found" description="Create a user account and assign a role to give your team access." />
  return <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">User</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className="text-sm hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><UserRound size={17} /></span><div><p className="font-bold text-ink">{user.fullName}</p><p className="mt-0.5 text-xs text-muted">{user.email}</p></div></div></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-xs font-semibold text-ink"><KeyRound size={14} className="text-muted" />{user.roleName || 'No role assigned'}</span></td><td className="px-5 py-4"><StatusBadge value={user.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => onEdit(user)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => onDelete(user)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>
}

function RolesTable({ roles, onEdit, onDelete }: { roles: Role[]; onEdit: (role: Role) => void; onDelete: (role: Role) => void }) {
  if (roles.length === 0) return <EmptyState title="No roles found" description="Create roles to define access levels for your team." />
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <div key={role.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ShieldCheck size={20} /></span><div className="flex gap-1"><button onClick={() => onEdit(role)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => onDelete(role)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></div><div className="mt-4 flex items-center gap-2"><h3 className="heading-font text-base font-extrabold text-ink">{role.name}</h3><StatusBadge value={role.active ? 'ACTIVE' : 'INACTIVE'} /></div><p className="mt-3 min-h-10 text-xs leading-5 text-muted">{role.description || 'No description added.'}</p><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Permissions</p><p className="mt-2 text-xs leading-5 text-ink">{role.permissions || 'No permissions added.'}</p></div></div>)}</div>
}

function UserModal({ editing, form, setForm, roles, saving, error, onClose, onSave }: { editing: UserAccount | null; form: UserForm; setForm: (form: UserForm) => void; roles: Role[]; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit user' : 'Add user'}</h2><p className="mt-1 text-xs text-muted">Assign a role to control this account's access.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><Field label="Full name" required value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Field label="Email" type="email" required value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label={editing ? 'New password (optional)' : 'Password'} type="password" required={!editing} value={form.password} onChange={(value) => setForm({ ...form, password: value })} /><SelectField label="Role" value={form.roleId} onChange={(value) => setForm({ ...form, roleId: value })} options={[{ value: '', label: 'No role assigned' }, ...roles.map((role) => ({ value: String(role.id), label: role.name }))]} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create user'}</button></div></form></div></div>
}

function RoleModal({ editing, form, setForm, saving, error, onClose, onSave }: { editing: Role | null; form: RoleForm; setForm: (form: RoleForm) => void; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit role' : 'Add role'}</h2><p className="mt-1 text-xs text-muted">Describe what this role can access.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><Field label="Role name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><TextArea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /><TextArea label="Permissions" value={form.permissions} onChange={(value) => setForm({ ...form, permissions: value })} placeholder="Example: Patients, Appointments, Billing" /><label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-ink"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-teal-600" />Role is active</label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create role'}</button></div></form></div></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
function TextArea({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><textarea rows={3} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function StatusBadge({ value }: { value: string }) { const active = value === 'ACTIVE'; return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{value}</span> }
