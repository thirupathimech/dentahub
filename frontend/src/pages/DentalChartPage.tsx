import { useEffect, useMemo, useState } from 'react'
import { Activity, FileText, Printer, RotateCcw, Save, Search, UserRound } from 'lucide-react'
import { apiGet, apiPut, Patient } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'

type ToothStatus = 'HEALTHY' | 'CARIES' | 'FILLED' | 'MISSING' | 'CROWN' | 'ROOT_CANAL' | 'IMPLANT' | 'FRACTURE'
type DentalChart = { patientId: number; patientName: string; phone: string; dateOfBirth: string | null; gender: string | null; branchId: number | null; toothStatuses: Record<string, ToothStatus>; notes: string | null; updatedAt: string | null }

const upperTeeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
const lowerTeeth = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']
const statuses: Array<{ value: ToothStatus; label: string; color: string; dot: string }> = [
  { value: 'HEALTHY', label: 'Healthy', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'CARIES', label: 'Caries', color: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  { value: 'FILLED', label: 'Filled', color: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  { value: 'MISSING', label: 'Missing', color: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-500' },
  { value: 'CROWN', label: 'Crown', color: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  { value: 'ROOT_CANAL', label: 'Root canal', color: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  { value: 'IMPLANT', label: 'Implant', color: 'border-cyan-200 bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  { value: 'FRACTURE', label: 'Fracture', color: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
]
const statusMap = Object.fromEntries(statuses.map((status) => [status.value, status])) as Record<ToothStatus, typeof statuses[number]>

export default function DentalChartPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [query, setQuery] = useState('')
  const [chart, setChart] = useState<DentalChart | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const requestedPatient = new URLSearchParams(window.location.search).get('patientId')
    apiGet<Patient[]>('/api/patients')
      .then((data) => {
        setPatients(data)
        const initial = requestedPatient && data.some((patient) => String(patient.id) === requestedPatient) ? requestedPatient : data[0] ? String(data[0].id) : ''
        setSelectedPatientId(initial)
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load patients'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedPatientId) { setChart(null); return }
    const patient = patients.find((item) => String(item.id) === selectedPatientId)
    if (!patient) return
    setChartLoading(true)
    setError('')
    apiGet<DentalChart>(`/api/dental-charts/${patient.id}`)
      .then(setChart)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load dental chart'))
      .finally(() => setChartLoading(false))
  }, [selectedPatientId, patients])

  const visiblePatients = useMemo(() => patients.filter((patient) => `${patient.fullName} ${patient.phone}`.toLowerCase().includes(query.toLowerCase())), [patients, query])
  const selectedPatient = patients.find((patient) => String(patient.id) === selectedPatientId)

  function updateTooth(tooth: string, status: ToothStatus) {
    if (!chart) return
    setSaved(false)
    setChart({ ...chart, toothStatuses: { ...chart.toothStatuses, [tooth]: status } })
  }

  function resetChart() {
    if (!chart || !window.confirm('Clear all tooth markings for this patient?')) return
    setSaved(false)
    setChart({ ...chart, toothStatuses: {} })
  }

  async function saveChart() {
    if (!chart) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const savedChart = await apiPut<DentalChart>(`/api/dental-charts/${chart.patientId}`, { toothStatuses: chart.toothStatuses, notes: chart.notes })
      setChart(savedChart)
      setSaved(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save dental chart')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />
  if (error && patients.length === 0) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (patients.length === 0) return <EmptyState title="No patients found" description="Add a patient before opening a dental chart." />

  return <div className="space-y-6 py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-muted">Record tooth conditions and clinical observations patient by patient.</p></div><div className="flex gap-2"><button onClick={() => window.print()} disabled={!chart || chartLoading} title="Print dental chart" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-muted hover:border-teal-200 hover:text-teal-700 disabled:opacity-50"><Printer size={16} /> Print</button><button onClick={saveChart} disabled={!chart || chartLoading || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-50"><Save size={16} />{saving ? 'Saving...' : saved ? 'Saved' : 'Save chart'}</button></div></div>
    {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted"><UserRound size={15} className="text-teal-600" /> Patient</div><div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Search size={16} className="shrink-0 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" placeholder="Search patients" /></div><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{visiblePatients.map((patient) => <button key={patient.id} onClick={() => { setSelectedPatientId(String(patient.id)); setQuery(''); setSaved(false) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selectedPatientId === String(patient.id) ? 'bg-teal-50 text-teal-800' : 'text-ink hover:bg-slate-50'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selectedPatientId === String(patient.id) ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-muted'}`}><UserRound size={15} /></span><span className="min-w-0"><span className="block truncate text-xs font-bold">{patient.fullName}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{patient.phone}</span></span></button>)}</div>{selectedPatient && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-lg font-extrabold text-ink">{selectedPatient.fullName}</p><p className="mt-1 text-xs text-muted">{selectedPatient.gender || 'Gender not recorded'}{selectedPatient.dateOfBirth ? ` · ${selectedPatient.dateOfBirth}` : ''}</p><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Marked teeth</p><p className="mt-1 text-2xl font-extrabold text-teal-700">{chart ? Object.keys(chart.toothStatuses).length : 0}<span className="ml-1 text-xs font-semibold text-muted">of 32</span></p></div></div>}</aside>
      <section className="min-w-0 space-y-6">{chartLoading || !chart ? <LoadingState /> : <><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Activity size={19} className="text-teal-600" /><h2 className="heading-font text-lg font-extrabold text-ink">Dental chart</h2></div><p className="mt-1 text-xs text-muted">FDI notation · Select a tooth to mark its current condition.</p></div><button onClick={resetChart} title="Clear tooth markings" className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-bold text-muted hover:bg-slate-100 hover:text-rose-600"><RotateCcw size={14} /> Clear markings</button></div><div className="mt-7 overflow-x-auto pb-2"><div className="min-w-[720px]"><div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted"><span>Upper jaw · right</span><span>Upper jaw · left</span></div><ToothRow teeth={upperTeeth} toothStatuses={chart.toothStatuses} onChange={updateTooth} /><div className="my-6 border-t border-dashed border-slate-200" /><ToothRow teeth={lowerTeeth} toothStatuses={chart.toothStatuses} onChange={updateTooth} /><div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted"><span>Lower jaw · right</span><span>Lower jaw · left</span></div></div></div><div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4">{statuses.map((status) => <span key={status.value} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.label}</span>)}</div></div><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center gap-2"><FileText size={18} className="text-teal-600" /><h3 className="heading-font text-base font-extrabold text-ink">Clinical notes</h3></div><textarea rows={4} value={chart.notes ?? ''} onChange={(event) => { setSaved(false); setChart({ ...chart, notes: event.target.value }) }} className="mt-4 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder="Add findings, observations or follow-up notes" />{chart.updatedAt && <p className="mt-2 text-[11px] text-muted">Last saved {new Date(chart.updatedAt).toLocaleString()}</p>}</div><div className="print-area hidden"><div className="print-report"><div className="print-header"><div><p className="print-kicker">Dental chart</p><h1>{chart.patientName}</h1><p>{chart.phone}{chart.dateOfBirth ? ` · DOB ${chart.dateOfBirth}` : ''}</p></div><p className="print-meta">Printed {new Date().toLocaleDateString()}</p></div><div className="print-summary"><div><span>Patient</span><strong>{chart.patientName}</strong></div><div><span>Marked teeth</span><strong>{Object.keys(chart.toothStatuses).length} of 32</strong></div><div><span>Notation</span><strong>FDI</strong></div></div><table className="print-table"><thead><tr><th>Tooth</th><th>Condition</th></tr></thead><tbody>{[...upperTeeth, ...lowerTeeth].filter((tooth) => chart.toothStatuses[tooth] && chart.toothStatuses[tooth] !== 'HEALTHY').map((tooth) => <tr key={tooth}><td>{tooth}</td><td>{statusMap[chart.toothStatuses[tooth]]?.label ?? chart.toothStatuses[tooth]}</td></tr>)}</tbody></table>{chart.notes && <div className="print-notes"><span>Clinical notes</span><p>{chart.notes}</p></div>}</div></div></>}</section>
    </div>
  </div>
}

function ToothRow({ teeth, toothStatuses, onChange }: { teeth: string[]; toothStatuses: Record<string, ToothStatus>; onChange: (tooth: string, status: ToothStatus) => void }) {
  return <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>{teeth.map((tooth) => { const status = toothStatuses[tooth] ?? 'HEALTHY'; const selected = statusMap[status] ?? statusMap.HEALTHY; return <div key={tooth} className="flex min-w-0 flex-col items-center gap-1.5"><span className="text-[10px] font-bold text-muted">{tooth}</span><div className="relative"><select aria-label={`Tooth ${tooth} condition`} value={status} onChange={(event) => onChange(tooth, event.target.value as ToothStatus)} className={`h-12 w-10 cursor-pointer appearance-none rounded-[45%] border-2 px-0 text-center text-[9px] font-extrabold outline-none transition hover:-translate-y-0.5 focus:ring-4 focus:ring-teal-500/15 ${selected.color}`}><option value="HEALTHY">OK</option>{statuses.filter((item) => item.value !== 'HEALTHY').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{status !== 'HEALTHY' && <span className={`pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${selected.dot}`} />}</div></div> })}</div>
}
