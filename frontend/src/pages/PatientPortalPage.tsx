import { FormEvent, useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { apiGet, apiPost, AuthUser } from '../api'

type PortalDoctor = { id: number; fullName: string; specialization: string; branchId: number | null }
type PortalAppointment = { id: number; doctorName: string; specialization: string; appointmentDateTime: string; appointmentEndDateTime: string; appointmentType: string; status: string; notes: string | null }

function dateKey(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 10)
}

function plusMinutes(value: string, minutes: number) {
  const [hours, mins] = value.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function PatientPortalPage({ user, branding, onLogout }: { user: AuthUser; branding: { clinicName: string; logoDataUrl: string }; onLogout: () => void }) {
  const [doctors, setDoctors] = useState<PortalDoctor[]>([])
  const [appointments, setAppointments] = useState<PortalAppointment[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(() => dateKey(new Date(Date.now() + 86400000)))
  const [startTime, setStartTime] = useState('09:00')
  const [appointmentType, setAppointmentType] = useState('Consultation')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([apiGet<PortalDoctor[]>('/api/patient-portal/doctors'), apiGet<PortalAppointment[]>('/api/patient-portal/appointments')])
      .then(([doctorData, appointmentData]) => { setDoctors(doctorData); setAppointments(appointmentData); if (!doctorId && doctorData[0]) setDoctorId(String(doctorData[0].id)); setError('') })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load your portal'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const saved = await apiPost<PortalAppointment>('/api/appointments/patient', {
        doctorId: Number(doctorId),
        appointmentDateTime: `${date}T${startTime}:00`,
        appointmentEndDateTime: `${date}T${plusMinutes(startTime, 30)}:00`,
        appointmentType,
        notes,
      })
      setAppointments((current) => [...current, saved].sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)))
      setNotes(''); setMessage('Appointment request booked successfully.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to book appointment')
    } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-soft sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-teal-600 text-white">{branding.logoDataUrl ? <img src={branding.logoDataUrl} alt="Clinic logo" className="h-full w-full object-contain" /> : <ShieldCheck size={20} />}</span><div><p className="heading-font text-base font-extrabold text-ink">{branding.clinicName}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Patient portal</p></div></div><button onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-rose-50 hover:text-rose-600"><LogOut size={15} /> Sign out</button></header>
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#087f8c] via-[#0c9098] to-[#46b7ac] px-6 py-8 text-white shadow-lg shadow-teal-600/10 sm:px-9 sm:py-10"><p className="text-sm font-medium text-teal-50/80">Welcome back</p><h1 className="heading-font mt-2 text-3xl font-extrabold sm:text-4xl">Hi, {user.name.split(' ')[0]} 👋</h1><p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/85">Book your next visit and keep track of your clinic appointments in one place.</p></section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><CalendarDays size={19} /></span><div><h2 className="heading-font text-base font-extrabold">Book an appointment</h2><p className="mt-1 text-xs text-muted">Choose a doctor and preferred time.</p></div></div><form onSubmit={book} className="mt-5 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Doctor</span><select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName} · {doctor.specialization}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Date</span><input required type="date" min={dateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Time</span><input required type="time" min="08:00" max="19:30" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Visit type</span><select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">{['Consultation', 'Follow-up', 'Cleaning', 'Emergency', 'Other'].map((type) => <option key={type}>{type}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">Notes</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder="Anything the clinic should know?" /></label>{error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}{message && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} />{message}</p>}<button disabled={saving || loading || doctors.length === 0} className="w-full rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-60">{saving ? 'Booking...' : 'Book appointment'}</button></form></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Clock3 size={19} /></span><div><h2 className="heading-font text-base font-extrabold">Your appointments</h2><p className="mt-1 text-xs text-muted">Upcoming visits and booking status.</p></div></div>{loading ? <p className="mt-6 text-sm text-muted">Loading appointments...</p> : appointments.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-muted">No appointments yet.</p> : <div className="mt-5 space-y-3">{appointments.map((appointment) => <div key={appointment.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-ink">{appointment.doctorName}</p><p className="mt-1 text-xs text-muted">{appointment.specialization} · {appointment.appointmentType}</p></div><span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">{appointment.status.replace('_', ' ')}</span></div><p className="mt-3 text-xs font-semibold text-ink">{new Date(appointment.appointmentDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div>)}</div>}</div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><UserRound size={19} /></span><div><h2 className="heading-font text-base font-extrabold">Your account</h2><p className="mt-1 flex items-center gap-2 text-xs text-muted"><Mail size={13} />{user.email}</p></div></div></section>
    </div>
  </div>
}
