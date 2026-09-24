import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, FileText, Pencil, Plus, Receipt, Search, Trash2, UserRound, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut, BillingInvoice, Patient, TreatmentPlan } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type InvoiceLine = { description: string; quantity: string; unitPrice: string }
type InvoiceForm = { patientId: string; treatmentPlanId: string; issueDate: string; dueDate: string; status: string; discount: string; tax: string; notes: string; items: InvoiceLine[] }

const statuses = ['DRAFT', 'ISSUED', 'VOID']
const emptyForm = (): InvoiceForm => ({ patientId: '', treatmentPlanId: '', issueDate: new Date().toISOString().slice(0, 10), dueDate: '', status: 'ISSUED', discount: '0', tax: '0', notes: '', items: [{ description: '', quantity: '1', unitPrice: '' }] })
const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
const dateLabel = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function fromInvoice(invoice: BillingInvoice): InvoiceForm {
  return {
    patientId: String(invoice.patientId),
    treatmentPlanId: invoice.treatmentPlanId ? String(invoice.treatmentPlanId) : '',
    issueDate: invoice.issueDate ?? '',
    dueDate: invoice.dueDate ?? '',
    status: invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID' ? 'ISSUED' : invoice.status,
    discount: String(invoice.discount ?? 0),
    tax: String(invoice.tax ?? 0),
    notes: invoice.notes ?? '',
    items: invoice.items.length ? invoice.items.map((item) => ({ description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) : [{ description: '', quantity: '1', unitPrice: '' }],
  }
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<InvoiceForm>(emptyForm())
  const [editing, setEditing] = useState<BillingInvoice | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([apiGet<BillingInvoice[]>('/api/billing/invoices'), apiGet<Patient[]>('/api/patients'), apiGet<TreatmentPlan[]>('/api/treatment-plans')])
      .then(([invoiceData, patientData, planData]) => { setInvoices(invoiceData); setPatients(patientData); setPlans(planData) })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load invoices'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => invoices.filter((invoice) => {
    const matchesQuery = `${invoice.invoiceNumber} ${invoice.patientName}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (statusFilter === 'ALL' || invoice.status === statusFilter)
  }), [invoices, query, statusFilter])

  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      billed: invoices.filter((item) => item.status !== 'VOID').reduce((sum, item) => sum + item.total, 0),
      collected: invoices.reduce((sum, item) => sum + item.paidAmount, 0),
      outstanding: invoices.filter((item) => item.status !== 'VOID').reduce((sum, item) => sum + item.balance, 0),
      overdue: invoices.filter((item) => item.status !== 'VOID' && item.balance > 0 && item.dueDate && item.dueDate < today).reduce((sum, item) => sum + item.balance, 0),
    }
  }, [invoices])

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); setError('') }
  const openEdit = (invoice: BillingInvoice) => { setEditing(invoice); setForm(fromInvoice(invoice)); setFormOpen(true); setError('') }
  const closeForm = () => { setEditing(null); setFormOpen(false); setForm(emptyForm()) }
  const updateLine = (index: number, value: Partial<InvoiceLine>) => setForm({ ...form, items: form.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...value } : line) })
  const choosePlan = (value: string) => {
    const plan = plans.find((item) => String(item.id) === value)
    setForm({ ...form, treatmentPlanId: value, items: plan?.treatments.length ? plan.treatments.map((item) => ({ description: item.treatmentName, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })) : form.items })
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        patientId: Number(form.patientId),
        treatmentPlanId: form.treatmentPlanId ? Number(form.treatmentPlanId) : null,
        issueDate: form.issueDate || null,
        dueDate: form.dueDate || null,
        status: form.status,
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
        notes: form.notes || null,
        items: form.items.filter((item) => item.description.trim()).map((item) => ({ description: item.description, quantity: Number(item.quantity) || 1, unitPrice: Number(item.unitPrice) || 0 })),
      }
      const saved = editing ? await apiPut<BillingInvoice>(`/api/billing/invoices/${editing.id}`, payload) : await apiPost<BillingInvoice>('/api/billing/invoices', payload)
      setInvoices((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      closeForm()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save invoice')
    } finally { setSaving(false) }
  }

  async function remove(invoice: BillingInvoice) {
    if (!window.confirm(`Delete ${invoice.invoiceNumber}?`)) return
    try { await apiDelete(`/api/billing/invoices/${invoice.id}`); setInvoices((current) => current.filter((item) => item.id !== invoice.id)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete invoice') }
  }

  return <div className="space-y-6 py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-muted">Create invoices, track balances, and keep every patient account clear.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"><Plus size={16} /> Create invoice</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Total billed" value={money(totals.billed)} caption="Across active invoices" icon={FileText} tone="teal" /><SummaryCard label="Collected" value={money(totals.collected)} caption="Payments received" icon={CheckCircle2} tone="emerald" /><SummaryCard label="Outstanding" value={money(totals.outstanding)} caption="Open patient balances" icon={Receipt} tone="blue" /><SummaryCard label="Overdue" value={money(totals.overdue)} caption="Past their due date" icon={CalendarDays} tone="orange" /></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-soft sm:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Search size={17} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search invoice or patient" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink outline-none"><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option><option value="PARTIALLY_PAID">Partially paid</option><option value="PAID">Paid</option><option value="VOID">Void</option></select></div>
    {error && !formOpen && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}
    {loading ? <LoadingState /> : error && invoices.length === 0 ? <ErrorState message={error} onRetry={load} /> : visible.length === 0 ? <EmptyState title="No invoices found" description="Create an invoice to start tracking a patient's bill and payments." /> : <InvoiceTable invoices={visible} onEdit={openEdit} onDelete={remove} />}
    {formOpen && <InvoiceModal editing={editing} form={form} setForm={setForm} patients={patients} plans={plans} choosePlan={choosePlan} updateLine={updateLine} saving={saving} error={error} onClose={closeForm} onSave={save} />}
  </div>
}

function SummaryCard({ label, value, caption, icon: Icon, tone }: { label: string; value: string; caption: string; icon: typeof FileText; tone: 'teal' | 'emerald' | 'blue' | 'orange' }) {
  const colors = { teal: 'bg-teal-50 text-teal-600', emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', orange: 'bg-orange-50 text-orange-600' }
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted">{label}</p><p className="heading-font mt-2 text-xl font-extrabold tracking-tight text-ink">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={19} /></span></div><p className="mt-5 text-[11px] text-muted">{caption}</p></div>
}

function InvoiceTable({ invoices, onEdit, onDelete }: { invoices: BillingInvoice[]; onEdit: (invoice: BillingInvoice) => void; onDelete: (invoice: BillingInvoice) => void }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">Invoice</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Issue date</th><th className="px-5 py-4">Due date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.map((invoice) => <tr key={invoice.id} className="text-sm transition hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><FileText size={17} /></span><div><p className="font-bold text-ink">{invoice.invoiceNumber}</p><p className="mt-0.5 text-xs text-muted">{invoice.items.length} line{invoice.items.length === 1 ? '' : 's'}</p></div></div></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs font-semibold text-ink"><UserRound size={13} className="text-muted" />{invoice.patientName}</p></td><td className="px-5 py-4 text-xs text-muted">{dateLabel(invoice.issueDate)}</td><td className="px-5 py-4 text-xs text-muted">{dateLabel(invoice.dueDate)}</td><td className="px-5 py-4"><StatusBadge status={invoice.status} /></td><td className="px-5 py-4 text-right"><p className="text-sm font-extrabold text-ink">{money(invoice.total)}</p><p className="mt-0.5 text-[11px] text-muted">{invoice.balance > 0 ? `${money(invoice.balance)} due` : 'Settled'}</p></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => onEdit(invoice)} aria-label={`Edit ${invoice.invoiceNumber}`} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => onDelete(invoice)} aria-label={`Delete ${invoice.invoiceNumber}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { DRAFT: 'bg-slate-100 text-slate-500', ISSUED: 'bg-blue-50 text-blue-600', PARTIALLY_PAID: 'bg-amber-50 text-amber-600', PAID: 'bg-emerald-50 text-emerald-600', VOID: 'bg-rose-50 text-rose-600' }
  return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${styles[status] ?? styles.ISSUED}`}>{status.replace('_', ' ')}</span>
}

function InvoiceModal({ editing, form, setForm, patients, plans, choosePlan, updateLine, saving, error, onClose, onSave }: { editing: BillingInvoice | null; form: InvoiceForm; setForm: (form: InvoiceForm) => void; patients: Patient[]; plans: TreatmentPlan[]; choosePlan: (value: string) => void; updateLine: (index: number, value: Partial<InvoiceLine>) => void; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const selectedPlans = plans.filter((plan) => !form.patientId || String(plan.patientId) === form.patientId)
  const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  const total = Math.max(0, subtotal - (Number(form.discount) || 0) + (Number(form.tax) || 0))
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="theme-modal max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit invoice' : 'Create invoice'}</h2><p className="mt-1 text-xs text-muted">Add billable items and keep the patient's account up to date.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Patient" required value={form.patientId} onChange={(value) => setForm({ ...form, patientId: value, treatmentPlanId: '' })} options={[{ value: '', label: 'Select patient' }, ...patients.map((patient) => ({ value: String(patient.id), label: patient.fullName }))]} /><SelectField label="Treatment plan" value={form.treatmentPlanId} onChange={choosePlan} options={[{ value: '', label: 'No treatment plan' }, ...selectedPlans.map((plan) => ({ value: String(plan.id), label: `${plan.title} · ${money(plan.estimatedTotal)}` }))]} /><Field label="Issue date" type="date" value={form.issueDate} onChange={(value) => setForm({ ...form, issueDate: value })} /><Field label="Due date" type="date" value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={statuses.map((status) => ({ value: status, label: status }))} /><Field label="Discount" type="number" value={form.discount} onChange={(value) => setForm({ ...form, discount: value })} /><Field label="Tax" type="number" value={form.tax} onChange={(value) => setForm({ ...form, tax: value })} /></div><div className="theme-modal-section rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold text-ink">Invoice items</p><p className="mt-1 text-[11px] text-muted">Use the treatment plan above or add custom charges.</p></div><button type="button" onClick={() => setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unitPrice: '' }] })} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-teal-700 shadow-sm"><Plus size={14} /> Add line</button></div><div className="mt-4 space-y-3">{form.items.map((line, index) => <div key={index} className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label={index === 0 ? 'Description' : ''} required value={line.description} onChange={(value) => updateLine(index, { description: value })} /></div><div className="w-20"><Field label={index === 0 ? 'Qty' : ''} type="number" value={line.quantity} onChange={(value) => updateLine(index, { quantity: value })} /></div><div className="w-28"><Field label={index === 0 ? 'Price' : ''} type="number" value={line.unitPrice} onChange={(value) => updateLine(index, { unitPrice: value })} /></div>{form.items.length > 1 && <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, lineIndex) => lineIndex !== index) })} className="mb-0.5 rounded-lg p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>}</div>)}</div><div className="mt-4 flex justify-end border-t border-slate-200 pt-3 text-sm font-extrabold text-teal-700">Invoice total&nbsp; {money(total)}</div></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create invoice'}</button></div></form></div></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} min={type === 'number' ? 0 : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
