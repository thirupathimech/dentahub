import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CreditCard, IndianRupee, Plus, Receipt, Search, Trash2, UserRound, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, BillingInvoice, Payment } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type PaymentForm = { invoiceId: string; paymentDate: string; amount: string; method: string; reference: string; notes: string }
const methods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']
const emptyForm = (): PaymentForm => ({ invoiceId: '', paymentDate: new Date().toISOString().slice(0, 10), amount: '', method: 'CASH', reference: '', notes: '' })
const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PaymentForm>(emptyForm())
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([apiGet<Payment[]>('/api/payments'), apiGet<BillingInvoice[]>('/api/billing/invoices')])
      .then(([paymentData, invoiceData]) => { setPayments(paymentData); setInvoices(invoiceData) })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load payments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => payments.filter((payment) => `${payment.receiptNumber} ${payment.invoiceNumber} ${payment.patientName} ${payment.method}`.toLowerCase().includes(query.toLowerCase())), [payments, query])
  const totals = useMemo(() => ({ received: payments.reduce((sum, payment) => sum + payment.amount, 0), count: payments.length, upi: payments.filter((payment) => payment.method === 'UPI').reduce((sum, payment) => sum + payment.amount, 0) }), [payments])
  const openCreate = () => { setForm(emptyForm()); setFormOpen(true); setError('') }
  const closeForm = () => { setFormOpen(false); setForm(emptyForm()) }
  const selectInvoice = (invoiceId: string) => { const invoice = invoices.find((item) => String(item.id) === invoiceId); setForm({ ...form, invoiceId, amount: invoice ? String(invoice.balance) : '' }) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await apiPost<Payment>('/api/payments', { invoiceId: Number(form.invoiceId), paymentDate: form.paymentDate || null, amount: Number(form.amount), method: form.method, reference: form.reference || null, notes: form.notes || null })
      setPayments((current) => [saved, ...current])
      setInvoices((current) => current.map((invoice) => invoice.id === saved.invoiceId ? { ...invoice, paidAmount: invoice.paidAmount + saved.amount, balance: Math.max(0, invoice.balance - saved.amount), status: invoice.balance - saved.amount <= 0 ? 'PAID' : 'PARTIALLY_PAID' } : invoice))
      closeForm()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to record payment') }
    finally { setSaving(false) }
  }

  async function remove(payment: Payment) {
    if (!window.confirm(`Delete ${payment.receiptNumber}? The invoice balance will be recalculated.`)) return
    try {
      await apiDelete(`/api/payments/${payment.id}`)
      setPayments((current) => current.filter((item) => item.id !== payment.id))
      setInvoices((current) => current.map((invoice) => invoice.id === payment.invoiceId ? { ...invoice, paidAmount: Math.max(0, invoice.paidAmount - payment.amount), balance: invoice.balance + payment.amount, status: invoice.paidAmount - payment.amount <= 0 ? 'ISSUED' : 'PARTIALLY_PAID' } : invoice))
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete payment') }
  }

  return <div className="space-y-6 py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-muted">Record collections against invoices and keep a clean payment history.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"><Plus size={16} /> Record payment</button></div>
    <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Total received" value={money(totals.received)} caption="All recorded payments" icon={IndianRupee} tone="teal" /><SummaryCard label="Payment entries" value={String(totals.count)} caption="Receipts in this workspace" icon={Receipt} tone="blue" /><SummaryCard label="Via UPI" value={money(totals.upi)} caption="Digital collections" icon={CreditCard} tone="violet" /></div>
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-soft"><div className="flex max-w-md items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Search size={17} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search receipt, invoice or patient" /></div></div>
    {error && !formOpen && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}
    {loading ? <LoadingState /> : error && payments.length === 0 ? <ErrorState message={error} onRetry={load} /> : visible.length === 0 ? <EmptyState title="No payments found" description="Record a payment from an invoice to see collection history here." /> : <PaymentTable payments={visible} onDelete={remove} />}
    {formOpen && <PaymentModal form={form} setForm={setForm} invoices={invoices} selectInvoice={selectInvoice} saving={saving} error={error} onClose={closeForm} onSave={save} />}
  </div>
}

function SummaryCard({ label, value, caption, icon: Icon, tone }: { label: string; value: string; caption: string; icon: typeof IndianRupee; tone: 'teal' | 'blue' | 'violet' }) {
  const colors = { teal: 'bg-teal-50 text-teal-600', blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600' }
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted">{label}</p><p className="heading-font mt-2 text-xl font-extrabold tracking-tight text-ink">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={19} /></span></div><p className="mt-5 text-[11px] text-muted">{caption}</p></div>
}

function PaymentTable({ payments, onDelete }: { payments: Payment[]; onDelete: (payment: Payment) => void }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">Receipt</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Invoice</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Method</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id} className="text-sm transition hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Receipt size={17} /></span><div><p className="font-bold text-ink">{payment.receiptNumber}</p>{payment.reference && <p className="mt-0.5 text-[11px] text-muted">Ref: {payment.reference}</p>}</div></div></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs font-semibold text-ink"><UserRound size={13} className="text-muted" />{payment.patientName}</p></td><td className="px-5 py-4 text-xs font-semibold text-teal-700">{payment.invoiceNumber}</td><td className="px-5 py-4 text-xs text-muted">{dateLabel(payment.paymentDate)}</td><td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{payment.method.replace('_', ' ')}</span></td><td className="px-5 py-4 text-right text-sm font-extrabold text-emerald-600">{money(payment.amount)}</td><td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => onDelete(payment)} aria-label={`Delete ${payment.receiptNumber}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>
}

function PaymentModal({ form, setForm, invoices, selectInvoice, saving, error, onClose, onSave }: { form: PaymentForm; setForm: (form: PaymentForm) => void; invoices: BillingInvoice[]; selectInvoice: (value: string) => void; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'VOID' && invoice.balance > 0)
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="theme-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">Record payment</h2><p className="mt-1 text-xs text-muted">Choose an open invoice and capture the collection details.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><SelectField label="Invoice" required value={form.invoiceId} onChange={selectInvoice} options={[{ value: '', label: 'Select open invoice' }, ...openInvoices.map((invoice) => ({ value: String(invoice.id), label: `${invoice.invoiceNumber} · ${invoice.patientName} · ${money(invoice.balance)} due` }))]} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Payment date" type="date" value={form.paymentDate} onChange={(value) => setForm({ ...form, paymentDate: value })} /><Field label="Amount" type="number" required value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} /><SelectField label="Payment method" value={form.method} onChange={(value) => setForm({ ...form, method: value })} options={methods.map((method) => ({ value: method, label: method.replace('_', ' ') }))} /><Field label="Reference" value={form.reference} onChange={(value) => setForm({ ...form, reference: value })} /></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>{openInvoices.length === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600">There are no open invoice balances ready for a payment.</p>}{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving || openInvoices.length === 0} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save payment'}</button></div></form></div></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} min={type === 'number' ? 0.01 : undefined} step={type === 'number' ? '0.01' : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
