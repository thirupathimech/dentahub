import { FormEvent, useEffect, useState } from 'react'
import { Mail, Pencil, Phone, Plus, Search, Stethoscope, Trash2, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut, Branch, Doctor } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type DoctorForm = { fullName: string; specialization: string; licenseNumber: string; phone: string; email: string; branchId: string; bio: string; status: string }
const emptyForm: DoctorForm = { fullName: '', specialization: '', licenseNumber: '', phone: '', email: '', branchId: '', bio: '', status: 'ACTIVE' }
function fromDoctor(doctor: Doctor): DoctorForm { return { fullName: doctor.fullName, specialization: doctor.specialization, licenseNumber: doctor.licenseNumber ?? '', phone: doctor.phone ?? '', email: doctor.email ?? '', branchId: doctor.branchId?.toString() ?? '', bio: doctor.bio ?? '', status: doctor.status } }

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<DoctorForm>(emptyForm)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadDoctors = () => {
    setLoading(true)
    setError('')
    Promise.all([apiGet<Doctor[]>(`/api/doctors?q=${encodeURIComponent(search)}`), apiGet<Branch[]>('/api/branches')])
      .then(([doctorData, branchData]) => { setDoctors(doctorData); setBranches(branchData) })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load doctors'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { const timer = window.setTimeout(loadDoctors, 250); return () => window.clearTimeout(timer) }, [search])
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); setError('') }
  const openEdit = (doctor: Doctor) => { setEditing(doctor); setForm(fromDoctor(doctor)); setFormOpen(true); setError('') }
  const closeForm = () => { setEditing(null); setFormOpen(false); setForm(emptyForm) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const payload = { ...form, branchId: form.branchId ? Number(form.branchId) : null }
    try {
      const saved = editing ? await apiPut<Doctor>(`/api/doctors/${editing.id}`, payload) : await apiPost<Doctor>('/api/doctors', payload)
      setDoctors((current) => editing ? current.map((doctor) => doctor.id === saved.id ? saved : doctor) : [saved, ...current]); closeForm()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save doctor') } finally { setSaving(false) }
  }

  async function remove(doctor: Doctor) {
    if (!window.confirm(`Delete ${doctor.fullName}?`)) return
    try { await apiDelete(`/api/doctors/${doctor.id}`); setDoctors((current) => current.filter((item) => item.id !== doctor.id)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete doctor') }
  }

  return <div className="space-y-6 py-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="text-sm text-muted">Manage dentists, specializations, and clinic availability.</p><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"><Plus size={16} /> Add doctor</button></div><div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"><div className="flex max-w-md items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Search size={17} className="text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search by name, specialty or phone" /></div></div>{error && !formOpen && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}{loading ? <LoadingState /> : error && doctors.length === 0 ? <ErrorState message={error} onRetry={loadDoctors} /> : doctors.length === 0 ? <EmptyState title="No doctors found" description="Add your first doctor to make appointment scheduling available." /> : <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">Doctor</th><th className="px-5 py-4">Specialization</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{doctors.map((doctor) => <tr key={doctor.id} className="text-sm hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Stethoscope size={17} /></span><div><p className="font-bold text-ink">{doctor.fullName}</p><p className="mt-0.5 text-xs text-muted">{doctor.licenseNumber || 'License not recorded'}</p></div></div></td><td className="px-5 py-4 text-xs text-muted">{doctor.specialization}</td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs text-ink"><Phone size={13} className="text-muted" />{doctor.phone || '—'}</p>{doctor.email && <p className="mt-1 flex items-center gap-2 text-xs text-muted"><Mail size={13} />{doctor.email}</p>}</td><td className="px-5 py-4"><StatusBadge value={doctor.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(doctor)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => remove(doctor)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>}{formOpen && <DoctorModal editing={editing} form={form} setForm={setForm} branches={branches} saving={saving} error={error} onClose={closeForm} onSave={save} />}</div>
}

function DoctorModal({ editing, form, setForm, branches, saving, error, onClose, onSave }: { editing: Doctor | null; form: DoctorForm; setForm: (form: DoctorForm) => void; branches: Branch[]; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit doctor' : 'Add doctor'}</h2><p className="mt-1 text-xs text-muted">Keep the professional profile ready for scheduling.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" required value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><Field label="Specialization" required value={form.specialization} onChange={(value) => setForm({ ...form, specialization: value })} /><Field label="License number" value={form.licenseNumber} onChange={(value) => setForm({ ...form, licenseNumber: value })} /><Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><SelectField label="Branch" value={form.branchId} onChange={(value) => setForm({ ...form, branchId: value })} options={[{ value: '', label: 'No branch' }, ...branches.map((branch) => ({ value: String(branch.id), label: branch.name }))]} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} /></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Bio</span><textarea rows={3} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create doctor'}</button></div></form></div></div>
}
function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
function StatusBadge({ value }: { value: string }) { const active = value === 'ACTIVE'; return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{value}</span> }
