import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Pencil, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut, Branch, Patient } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type PatientForm = {
  fullName: string
  phone: string
  email: string
  dateOfBirth: string
  gender: string
  address: string
  emergencyContact: string
  medicalNotes: string
  password: string
  status: string
}

const emptyForm: PatientForm = { fullName: '', phone: '', email: '', dateOfBirth: '', gender: '', address: '', emergencyContact: '', medicalNotes: '', password: '', status: 'ACTIVE' }

function fromPatient(patient: Patient): PatientForm {
  return { fullName: patient.fullName, phone: patient.phone, email: patient.email ?? '', dateOfBirth: patient.dateOfBirth ?? '', gender: patient.gender ?? '', address: patient.address ?? '', emergencyContact: patient.emergencyContact ?? '', medicalNotes: patient.medicalNotes ?? '', password: '', status: patient.status }
}

export default function PatientsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [sort, setSort] = useState<'name' | 'dob'>('name')
  const [page, setPage] = useState(1)
  const [branches, setBranches] = useState<Branch[]>([])
  const pageSize = 10

  const loadPatients = () => {
    setLoading(true)
    setError('')
    apiGet<Patient[]>(`/api/patients?q=${encodeURIComponent(search)}`)
      .then(setPatients)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load patients'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(loadPatients, 250)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => { apiGet<Branch[]>('/api/branches').then(setBranches).catch(() => undefined) }, [])

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('q') ?? ''
    setSearch((current) => current === query ? current : query)
  }, [location.search])
  const filtered = patients.filter((patient) => (statusFilter === 'ALL' || patient.status === statusFilter) && (branchFilter === 'ALL' || String(patient.branchId) === branchFilter))
    .sort((a, b) => sort === 'name' ? a.fullName.localeCompare(b.fullName) : (b.dateOfBirth ?? '').localeCompare(a.dateOfBirth ?? ''))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { setPage(1) }, [search, statusFilter, branchFilter, sort])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); setError('') }
  const openEdit = (patient: Patient) => { setEditing(patient); setForm(fromPatient(patient)); setFormOpen(true); setError('') }
  const closeForm = () => { setEditing(null); setFormOpen(false); setForm(emptyForm) }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') === 'create') openCreate()
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, email: form.email || null, dateOfBirth: form.dateOfBirth || null, password: form.password || null }
      const saved = editing ? await apiPut<Patient>(`/api/patients/${editing.id}`, payload) : await apiPost<Patient>('/api/patients', payload)
      setPatients((current) => editing ? current.map((patient) => patient.id === saved.id ? saved : patient) : [saved, ...current])
      closeForm()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save patient')
    } finally {
      setSaving(false)
    }
  }

  async function remove(patient: Patient) {
    if (!window.confirm(`Delete ${patient.fullName}?`)) return
    try {
      await apiDelete(`/api/patients/${patient.id}`)
      setPatients((current) => current.filter((item) => item.id !== patient.id))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete patient')
    }
  }

  return <div className="space-y-6 py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-muted">Manage patient profiles and clinical contact details.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700"><Plus size={16} /> Add patient</button></div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"><div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5"><Search size={17} className="text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search by name, phone or email" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="ALL">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value as 'name' | 'dob')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><option value="name">Sort by name</option><option value="dob">Sort by DOB</option></select></div>
    {error && !formOpen && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}
    {loading ? <LoadingState /> : error && patients.length === 0 ? <ErrorState message={error} onRetry={loadPatients} /> : visible.length === 0 ? <EmptyState title="No patients found" description="Add your first patient to start building the clinic records." /> : <><div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Date of birth</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((patient) => <tr key={patient.id} className="text-sm transition hover:bg-slate-50/60"><td className="px-5 py-4"><button onClick={() => navigate(`/patients/${patient.id}`)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><UserRound size={17} /></span><span><span className="block font-bold text-ink hover:text-teal-700">{patient.fullName}</span><span className="mt-0.5 block text-xs text-muted">{patient.gender || 'Gender not recorded'}</span></span></button></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs text-ink"><Phone size={13} className="text-muted" />{patient.phone}</p>{patient.email && <p className="mt-1 flex items-center gap-2 text-xs text-muted"><Mail size={13} />{patient.email}</p>}</td><td className="px-5 py-4 text-xs text-muted">{patient.dateOfBirth || '—'}</td><td className="px-5 py-4"><StatusBadge value={patient.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(patient)} aria-label={`Edit ${patient.fullName}`} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => remove(patient)} aria-label={`Delete ${patient.fullName}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div><Pagination page={page} pageCount={pageCount} onChange={setPage} /></>}
    {formOpen && <PatientModal editing={editing} form={form} setForm={setForm} saving={saving} error={error} onClose={closeForm} onSave={save} />}
  </div>
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) { return <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-muted shadow-soft"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => onChange(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page === pageCount} onClick={() => onChange(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div> }

function PatientModal({ editing, form, setForm, saving, error, onClose, onSave }: { editing: Patient | null; form: PatientForm; setForm: (form: PatientForm) => void; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit patient' : 'Add patient'}</h2><p className="mt-1 text-xs text-muted">Keep patient information accurate and up to date.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" required value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Field label="Phone" required value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label="Date of birth" type="date" value={form.dateOfBirth} onChange={(value) => setForm({ ...form, dateOfBirth: value })} /><SelectField label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={['', 'FEMALE', 'MALE', 'OTHER']} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['ACTIVE', 'INACTIVE']} /><Field label="Emergency contact" value={form.emergencyContact} onChange={(value) => setForm({ ...form, emergencyContact: value })} /><Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} /></div><div className="patient-access-card rounded-2xl border border-teal-100 p-4"><p className="text-xs font-bold text-teal-800">Patient portal access</p><p className="mt-1 text-[11px] text-teal-700">Set a password to let this patient sign in with their email.</p><div className="mt-3"><Field label={editing ? 'New password (leave blank to keep current)' : 'Password'} type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} /></div></div><TextArea label="Medical notes" value={form.medicalNotes} onChange={(value) => setForm({ ...form, medicalNotes: value })} />{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create patient'}</button></div></form></div></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option} value={option}>{option || 'Select'}</option>)}</select></label> }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function StatusBadge({ value }: { value: string }) { const active = value === 'ACTIVE'; return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{value}</span> }
