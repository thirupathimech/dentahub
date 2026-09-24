import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, List, Pencil, Plus, Stethoscope, Trash2, UserRound, X } from 'lucide-react'
import { apiDelete, apiGet, apiPost, apiPut, ApiRequestError, Appointment, AppointmentConflict, Doctor, Patient } from '../api'
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates'
import AutocompleteField from '../components/AutocompleteField'
import { patientIdentity, patientOption } from '../components/patientOptions'

type AppointmentForm = { patientId: string; doctorId: string; appointmentDate: string; startTime: string; endTime: string; appointmentType: string; status: string; notes: string }
type AppointmentView = 'SCHEDULE' | 'LIST'

const statuses = ['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
const appointmentTypes = ['Consultation', 'New patient consultation', 'Follow-up', 'Cleaning', 'Filling', 'Root canal', 'Extraction', 'Crown / Bridge', 'Orthodontic', 'Emergency', 'Other']
const scheduleStartHour = 8
const scheduleEndHour = 20
const hourHeight = 76

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function emptyForm(date = localDateKey(new Date())): AppointmentForm {
  return { patientId: '', doctorId: '', appointmentDate: date, startTime: '09:00', endTime: '09:30', appointmentType: '', status: 'SCHEDULED', notes: '' }
}

function fromAppointment(appointment: Appointment): AppointmentForm {
  const start = appointment.appointmentDateTime.slice(0, 16)
  const end = appointment.appointmentEndDateTime?.slice(0, 16) ?? `${appointment.appointmentDateTime.slice(0, 10)}T${appointment.appointmentDateTime.slice(11, 16)}`
  const fallbackEnd = new Date(`${end}:00`)
  if (!appointment.appointmentEndDateTime) fallbackEnd.setMinutes(fallbackEnd.getMinutes() + 30)
  return {
    patientId: String(appointment.patientId),
    doctorId: String(appointment.doctorId),
    appointmentDate: appointment.appointmentDateTime.slice(0, 10),
    startTime: start.slice(11, 16),
    endTime: fallbackEnd.toTimeString().slice(0, 5),
    appointmentType: appointment.appointmentType,
    status: appointment.status,
    notes: appointment.notes ?? '',
  }
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function timeLabel(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })
}

function isAppointmentConflict(payload: unknown): payload is AppointmentConflict {
  if (!payload || typeof payload !== 'object') return false
  const value = payload as Partial<AppointmentConflict>
  return typeof value.message === 'string' && Array.isArray(value.conflicts) && Array.isArray(value.availableSlots)
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()))
  const [view, setView] = useState<AppointmentView>('SCHEDULE')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<AppointmentForm>(emptyForm())
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [conflict, setConflict] = useState<AppointmentConflict | null>(null)
  const [saving, setSaving] = useState(false)

  const loadAppointments = (date = selectedDate) => {
    setLoading(true); setError('')
    apiGet<Appointment[]>(`/api/appointments?date=${encodeURIComponent(date)}`)
      .then((appointmentData) => setAppointments(appointmentData))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load appointments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.all([apiGet<Patient[]>('/api/patients'), apiGet<Doctor[]>('/api/doctors')])
      .then(([patientData, doctorData]) => { setPatients(patientData); setDoctors(doctorData) })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load appointment references'))
  }, [])
  useEffect(() => { loadAppointments(selectedDate) }, [selectedDate])

  const openCreate = () => { setEditing(null); setForm(emptyForm(selectedDate)); setFormOpen(true); setError('') }
  const openEdit = (appointment: Appointment) => { setEditing(appointment); setSelectedDate(appointment.appointmentDateTime.slice(0, 10)); setForm(fromAppointment(appointment)); setFormOpen(true); setError('') }
  const closeForm = () => { setEditing(null); setFormOpen(false); setConfirmOpen(false); setConflict(null); setForm(emptyForm(selectedDate)) }
  const filtered = statusFilter === 'ALL' ? appointments : appointments.filter((appointment) => appointment.status === statusFilter)
  const selectedDayAppointments = useMemo(() => filtered.filter((appointment) => appointment.appointmentDateTime.slice(0, 10) === selectedDate).sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)), [filtered, selectedDate])

  function requestSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!form.patientId || !form.doctorId) {
      setError('Please select a patient and doctor from the autocomplete suggestions'); return
    }
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      setError('End time must be after start time'); return
    }
    setConfirmOpen(true)
  }

  async function confirmSave(overrideConflict = false) {
    setSaving(true); setError('')
    const payload = {
      patientId: Number(form.patientId),
      doctorId: Number(form.doctorId),
      appointmentDateTime: `${form.appointmentDate}T${form.startTime}:00`,
      appointmentEndDateTime: `${form.appointmentDate}T${form.endTime}:00`,
      appointmentType: form.appointmentType,
      status: form.status,
      notes: form.notes,
      overrideConflict,
    }
    try {
      const saved = editing ? await apiPut<Appointment>(`/api/appointments/${editing.id}`, payload) : await apiPost<Appointment>('/api/appointments', payload)
      setAppointments((current) => (editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]).sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)))
      setSelectedDate(saved.appointmentDateTime.slice(0, 10)); closeForm()
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 409 && isAppointmentConflict(requestError.payload)) {
        setConfirmOpen(false); setConflict(requestError.payload)
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save appointment')
      }
    } finally { setSaving(false) }
  }

  async function remove(appointment: Appointment) {
    if (!window.confirm(`Delete appointment for ${appointment.patientName}?`)) return
    try { await apiDelete(`/api/appointments/${appointment.id}`); setAppointments((current) => current.filter((item) => item.id !== appointment.id)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to delete appointment') }
  }

  return <div className="space-y-6 py-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><p className="text-sm text-muted">Schedule and track appointments across your clinic.</p><p className="mt-1 text-xs text-muted">Select a date to see every visit in a time-based schedule.</p></div>
      <button onClick={openCreate} disabled={patients.length === 0 || doctors.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> New appointment</button>
    </div>

    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-bold text-muted">Filter status</span>{statuses.map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${statusFilter === status ? 'bg-teal-600 text-white' : 'bg-slate-50 text-muted hover:bg-teal-50 hover:text-teal-700'}`}>{status.replace('_', ' ')}</button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} /><div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1"><button onClick={() => setView('SCHEDULE')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold ${view === 'SCHEDULE' ? 'bg-white text-teal-700 shadow-sm' : 'text-muted'}`}><CalendarDays size={14} /> Schedule</button><button onClick={() => setView('LIST')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold ${view === 'LIST' ? 'bg-white text-teal-700 shadow-sm' : 'text-muted'}`}><List size={14} /> List</button></div></div>
    </div>

    {error && !formOpen && <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{error}</p>}
    {loading ? <LoadingState /> : error && appointments.length === 0 ? <ErrorState message={error} onRetry={loadAppointments} /> : view === 'SCHEDULE' ? <ScheduleView appointments={selectedDayAppointments} selectedDate={selectedDate} onEdit={openEdit} /> : <AppointmentList appointments={filtered} selectedDate={selectedDate} patients={patients} doctors={doctors} onEdit={openEdit} onRemove={remove} />}
    {formOpen && <AppointmentModalAutocomplete editing={editing} form={form} setForm={setForm} patients={patients} doctors={doctors} saving={saving} error={error} onClose={closeForm} onSave={requestSave} />}
    {confirmOpen && <ConfirmationModal editing={editing} patientName={patientIdentity(patients.find((patient) => String(patient.id) === form.patientId))} doctorName={doctors.find((doctor) => String(doctor.id) === form.doctorId)?.fullName ?? 'Selected doctor'} form={form} saving={saving} onClose={() => setConfirmOpen(false)} onConfirm={() => confirmSave(false)} />}
    {conflict && <ConflictModal conflict={conflict} saving={saving} onChooseAnother={() => setConflict(null)} onChooseSlot={(slot) => { setForm({ ...form, startTime: slot.startTime, endTime: slot.endTime }); setConflict(null) }} onOverride={() => confirmSave(true)} />}
  </div>
}

function DateNavigator({ selectedDate, setSelectedDate }: { selectedDate: string; setSelectedDate: (value: string) => void }) {
  return <div className="flex items-center gap-2"><button aria-label="Previous day" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="rounded-lg border border-slate-200 p-2 text-muted hover:border-teal-300 hover:text-teal-700"><ChevronLeft size={16} /></button><input aria-label="Choose appointment date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /><button onClick={() => setSelectedDate(localDateKey(new Date()))} className="rounded-lg bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-700 hover:bg-teal-100">Today</button><button aria-label="Next day" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} className="rounded-lg border border-slate-200 p-2 text-muted hover:border-teal-300 hover:text-teal-700"><ChevronRight size={16} /></button></div>
}

function ScheduleView({ appointments, selectedDate, onEdit }: { appointments: Appointment[]; selectedDate: string; onEdit: (appointment: Appointment) => void }) {
  const scheduleHeight = (scheduleEndHour - scheduleStartHour) * hourHeight
  return <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Clock3 size={17} /></span><h2 className="heading-font text-base font-extrabold text-ink">Daily schedule</h2></div><p className="mt-2 text-xs text-muted">{formatDateLabel(selectedDate)} · {appointments.length} appointment{appointments.length === 1 ? '' : 's'}</p></div>
      <div className="text-right text-xs font-semibold text-muted">Only appointments for the selected date are shown</div>
    </div>
    <div className="overflow-x-auto"><div className="grid min-w-[720px] grid-cols-[76px_minmax(640px,1fr)]">
      <div className="border-r border-slate-100 bg-slate-50/50" />
      <div className="border-b border-slate-100 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Appointments</div>
      <div className="relative border-r border-slate-100 bg-slate-50/50" style={{ height: scheduleHeight }}>{Array.from({ length: scheduleEndHour - scheduleStartHour }, (_, index) => <span key={index} className="absolute right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400" style={{ top: index * hourHeight }}>{timeLabel(scheduleStartHour + index)}</span>)}</div>
      <div className="relative" style={{ height: scheduleHeight }}>
        {Array.from({ length: scheduleEndHour - scheduleStartHour + 1 }, (_, index) => <div key={index} className="absolute inset-x-0 border-t border-slate-100" style={{ top: index * hourHeight }} />)}
        {appointments.length === 0 && <div className="absolute inset-0 flex items-center justify-center"><EmptyState title="No appointments for this date" description="Choose another date or create a new appointment for this schedule." /></div>}
        {appointments.map((appointment) => <ScheduleAppointment key={appointment.id} appointment={appointment} onEdit={onEdit} />)}
      </div>
    </div></div>
  </section>
}

function ScheduleAppointment({ appointment, onEdit }: { appointment: Appointment; onEdit: (appointment: Appointment) => void }) {
  const start = timeToMinutes(appointment.appointmentDateTime.slice(11, 16))
  const end = timeToMinutes(appointment.appointmentEndDateTime.slice(11, 16))
  const topMinutes = Math.max(start, scheduleStartHour * 60) - scheduleStartHour * 60
  const duration = Math.max(end - start, 30)
  const top = (topMinutes / 60) * hourHeight
  const height = Math.max((duration / 60) * hourHeight - 5, 58)
  return <button onClick={() => onEdit(appointment)} className="absolute left-3 right-3 overflow-hidden rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md" style={{ top, height }} title={`Edit appointment for ${appointment.patientName}`}>
    <div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-extrabold text-teal-800">{appointment.patientName}</p><StatusBadge value={appointment.status} /></div>
    <p className="mt-1 truncate text-[11px] font-semibold text-teal-700">{appointment.appointmentDateTime.slice(11, 16)} – {appointment.appointmentEndDateTime.slice(11, 16)} · {appointment.appointmentType}</p>
    <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-teal-700/80"><Stethoscope size={12} />{appointment.doctorName}</p>
  </button>
}

function AppointmentList({ appointments, selectedDate, patients, doctors, onEdit, onRemove }: { appointments: Appointment[]; selectedDate: string; patients: Patient[]; doctors: Doctor[]; onEdit: (appointment: Appointment) => void; onRemove: (appointment: Appointment) => void }) {
  if (appointments.length === 0) return <EmptyState title="No appointments found" description={patients.length === 0 || doctors.length === 0 ? 'Add at least one patient and doctor before scheduling.' : 'Create an appointment to see it here.'} />
  return <div className="space-y-3"><div><h2 className="heading-font text-base font-extrabold text-ink">Appointments for {formatDateLabel(selectedDate)}</h2><p className="mt-1 text-xs text-muted">Only appointments starting on the selected date are loaded.</p></div><div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft"><div className="overflow-x-auto"><table className="min-w-[960px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><th className="px-5 py-4">Date</th><th className="px-5 py-4">Time</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Doctor</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{appointments.map((appointment) => <tr key={appointment.id} className="text-sm hover:bg-slate-50/60"><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs font-bold text-ink"><CalendarDays size={14} className="text-teal-600" />{formatDateTime(appointment.appointmentDateTime).split(',')[0]}</p></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs font-bold text-ink"><Clock3 size={14} className="text-muted" />{appointment.appointmentDateTime.slice(11, 16)} – {appointment.appointmentEndDateTime.slice(11, 16)}</p></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs font-bold text-ink"><UserRound size={14} className="text-muted" />{appointment.patientName}</p></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-xs text-muted"><Stethoscope size={14} />{appointment.doctorName}</p></td><td className="px-5 py-4 text-xs text-muted">{appointment.appointmentType}</td><td className="px-5 py-4"><StatusBadge value={appointment.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => onEdit(appointment)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600"><Pencil size={15} /></button><button onClick={() => onRemove(appointment)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div></div>
}

function ConfirmationModal({ editing, patientName, doctorName, form, saving, onClose, onConfirm }: { editing: Appointment | null; patientName: string; doctorName: string; form: AppointmentForm; saving: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><CalendarDays size={20} /></div><h2 className="heading-font mt-4 text-xl font-extrabold text-ink">Confirm appointment</h2><p className="mt-2 text-sm leading-6 text-muted">Please confirm these details before the appointment is created.</p><div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Patient</p><p className="mt-1 text-sm font-bold text-ink">{patientName}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Doctor</p><p className="mt-1 text-sm font-bold text-ink">{doctorName}</p></div><div className="flex gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Date</p><p className="mt-1 text-sm font-bold text-ink">{form.appointmentDate}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Time</p><p className="mt-1 text-sm font-bold text-ink">{form.startTime} – {form.endTime}</p></div></div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100 disabled:opacity-50">Back to edit</button><button type="button" onClick={onConfirm} disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Confirming...' : editing ? 'Confirm changes' : 'Confirm appointment'}</button></div></div></div>
}

function ConflictModal({ conflict, saving, onChooseAnother, onChooseSlot, onOverride }: { conflict: AppointmentConflict; saving: boolean; onChooseAnother: () => void; onChooseSlot: (slot: { startTime: string; endTime: string }) => void; onOverride: () => void }) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Clock3 size={20} /></div><h2 className="heading-font mt-4 text-xl font-extrabold text-ink">Time slot is already occupied</h2><p className="mt-2 text-sm leading-6 text-muted">{conflict.message} Choose a free time or override the conflict if you want to continue.</p><div className="mt-5 space-y-2">{conflict.conflicts.map((item) => <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-ink">{item.appointmentDateTime.slice(11, 16)} – {item.appointmentEndDateTime.slice(11, 16)}</p><span className="text-[10px] font-bold text-amber-700">{item.reason}</span></div><p className="mt-1 text-xs text-muted">{item.patientName} · {item.doctorName}</p></div>)}</div><div className="mt-5"><p className="text-xs font-bold text-ink">Free available times</p>{conflict.availableSlots.length === 0 ? <p className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-muted">No free slots found between 08:00 and 20:00 for this duration.</p> : <div className="mt-2 flex flex-wrap gap-2">{conflict.availableSlots.map((slot) => <button key={`${slot.startTime}-${slot.endTime}`} onClick={() => onChooseSlot(slot)} disabled={saving} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-700 hover:border-teal-400 hover:bg-teal-100 disabled:opacity-50">Use {slot.startTime} – {slot.endTime}</button>)}</div>}</div><div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onChooseAnother} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100 disabled:opacity-50">Choose another time</button><button type="button" onClick={onOverride} disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60">{saving ? 'Overriding...' : 'Override & create'}</button></div></div></div>
}

function AppointmentModalAutocomplete({ editing, form, setForm, patients, doctors, saving, error, onClose, onSave }: { editing: Appointment | null; form: AppointmentForm; setForm: (form: AppointmentForm) => void; patients: Patient[]; doctors: Doctor[]; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  const typeOptions = Array.from(new Set(form.appointmentType ? [...appointmentTypes, form.appointmentType] : appointmentTypes)).map((value) => ({ value, label: value }))
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit appointment' : 'New appointment'}</h2><p className="mt-1 text-xs text-muted">Search the patient and doctor, then choose the appointment type.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><AutocompleteField label="Patient" required value={form.patientId} onChange={(value) => setForm({ ...form, patientId: value })} options={patients.map(patientOption)} placeholder="Search name, phone or patient ID" /><AutocompleteField label="Doctor" required value={form.doctorId} onChange={(value) => setForm({ ...form, doctorId: value })} options={doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.fullName} · ${doctor.specialization}` }))} placeholder="Search doctor" /><Field label="Date" type="date" required value={form.appointmentDate} onChange={(value) => setForm({ ...form, appointmentDate: value })} /><Field label="Start time" type="time" required value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} /><Field label="End time" type="time" required value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} /><SelectField label="Appointment type" required value={form.appointmentType} onChange={(value) => setForm({ ...form, appointmentType: value })} options={[{ value: '', label: 'Select appointment type' }, ...typeOptions]} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: value.replace('_', ' ') }))} /></div><label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-ink"><Clock3 size={14} className="text-muted" />Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create appointment'}</button></div></form></div></div>
}

function AppointmentModal({ editing, form, setForm, patients, doctors, saving, error, onClose, onSave }: { editing: Appointment | null; form: AppointmentForm; setForm: (form: AppointmentForm) => void; patients: Patient[]; doctors: Doctor[]; saving: boolean; error: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="heading-font text-xl font-extrabold text-ink">{editing ? 'Edit appointment' : 'New appointment'}</h2><p className="mt-1 text-xs text-muted">Choose the date, start time, and end time for the visit.</p></div><button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={onSave} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Patient" required value={form.patientId} onChange={(value) => setForm({ ...form, patientId: value })} options={[{ value: '', label: 'Select patient' }, ...patients.map((patient) => ({ value: String(patient.id), label: patient.fullName }))]} /><SelectField label="Doctor" required value={form.doctorId} onChange={(value) => setForm({ ...form, doctorId: value })} options={[{ value: '', label: 'Select doctor' }, ...doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.fullName} · ${doctor.specialization}` }))]} /><Field label="Date" type="date" required value={form.appointmentDate} onChange={(value) => setForm({ ...form, appointmentDate: value })} /><Field label="Start time" type="time" required value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} /><Field label="End time" type="time" required value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} /><Field label="Appointment type" required value={form.appointmentType} onChange={(value) => setForm({ ...form, appointmentType: value })} /><SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: value.replace('_', ' ') }))} /></div><label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-bold text-ink"><Clock3 size={14} className="text-muted" />Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Save changes' : 'Create appointment'}</button></div></form></div></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label> }
function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string; description?: string }[]; required?: boolean }) { if (label === 'Patient') return <AutocompleteField label={label} required={required} value={value} onChange={onChange} options={options} placeholder="Search name, phone or patient ID" />; return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
function StatusBadge({ value }: { value: string }) { const styles: Record<string, string> = { SCHEDULED: 'bg-blue-50 text-blue-600', CONFIRMED: 'bg-emerald-50 text-emerald-600', COMPLETED: 'bg-teal-50 text-teal-700', CANCELLED: 'bg-rose-50 text-rose-600', NO_SHOW: 'bg-slate-100 text-slate-500' }; return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${styles[value] ?? 'bg-slate-100 text-slate-500'}`}>{value.replace('_', ' ')}</span> }
