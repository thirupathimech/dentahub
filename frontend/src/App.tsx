import { FormEvent, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppointmentsPage from './pages/AppointmentsPage'
import BranchPage from './pages/BranchPage'
import DoctorsPage from './pages/DoctorsPage'
import PatientsPage from './pages/PatientsPage'
import SettingsPage from './pages/SettingsPage'
import UsersRolesPage from './pages/UsersRolesPage'
import { apiGet } from './api'
import {
  Activity,
  AlarmClock,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageSquareMore,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type IconType = typeof LayoutDashboard

type MenuItem = {
  label: string
  path: string
  icon: IconType
}

const navigation: MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Patients', path: '/patients', icon: UsersRound },
  { label: 'Appointments', path: '/appointments', icon: CalendarDays },
  { label: 'Doctors', path: '/doctors', icon: Stethoscope },
  { label: 'Consultation', path: '/consultation', icon: MessageSquareMore },
  { label: 'Dental Chart', path: '/dental-chart', icon: Activity },
  { label: 'Treatment Plans', path: '/treatment-plans', icon: ClipboardList },
  { label: 'Treatments', path: '/treatments', icon: FolderKanban },
  { label: 'Billing', path: '/billing', icon: FileText },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Users / Roles', path: '/users-roles', icon: ShieldCheck },
  { label: 'Branch', path: '/branch', icon: CircleDollarSign },
]

const utilityNavigation: MenuItem[] = [{ label: 'Settings', path: '/settings', icon: Settings }]

type Summary = {
  date: string
  totalPatients: number
  todayAppointments: number
  totalDoctors: number
  totalBranches: number
  appointments: Array<{
    appointmentDateTime: string
    doctor: string
    patient: string
    appointmentType: string
    status: string
  }>
}

const initialSummary: Summary = {
  date: new Date().toISOString().slice(0, 10),
  totalPatients: 0,
  todayAppointments: 0,
  totalDoctors: 0,
  totalBranches: 0,
  appointments: [],
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem('dentahub_token')))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => setAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const logout = () => {
    localStorage.removeItem('dentahub_token')
    localStorage.removeItem('dentahub_user')
    setAuthenticated(false)
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Sidebar open={sidebarOpen} collapsed={collapsed} onClose={() => setSidebarOpen(false)} onLogout={logout} />
      <main className={`min-h-screen transition-all duration-300 ${collapsed ? 'lg:pl-[88px]' : 'lg:pl-[260px]'}`}>
        <Header onMenu={() => setSidebarOpen(true)} />
        <div className="mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/branch" element={<BranchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users-roles" element={<UsersRolesPage />} />
            {navigation.filter(({ path }) => !['/', '/patients', '/appointments', '/doctors', '/branch', '/users-roles'].includes(path)).filter(({ path }) => path !== '/settings').map(({ label, path, icon: Icon }) => (
              <Route key={path} path={path} element={<ComingSoonPage label={label} icon={Icon} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <button
        aria-label="Toggle sidebar"
        onClick={() => setCollapsed((value) => !value)}
        className="fixed bottom-5 left-5 z-40 hidden h-10 w-10 items-center justify-center rounded-xl border border-teal-100 bg-white text-teal-700 shadow-soft transition hover:bg-teal-50 lg:flex"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>
  )
}

function Sidebar({ open, collapsed, onClose, onLogout }: { open: boolean; collapsed: boolean; onClose: () => void; onLogout: () => void }) {
  return (
    <>
      {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-[88px]' : ''}`}>
        <div className={`flex h-[88px] items-center border-b border-slate-100 px-6 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><Stethoscope size={21} /></span>
            <span className={`${collapsed ? 'lg:hidden' : ''}`}>
              <span className="heading-font block text-[19px] font-extrabold tracking-tight text-ink">Denta<span className="text-teal-600">Hub</span></span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Care, made simple</span>
            </span>
          </NavLink>
          <button onClick={onClose} aria-label="Close navigation" className="rounded-lg p-2 text-muted hover:bg-teal-50 hover:text-teal-700 lg:hidden"><X size={19} /></button>
        </div>
        <div className="scrollbar-hidden flex-1 overflow-y-auto px-3 py-6">
          <p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>Workspace</p>
          <nav className="space-y-1">
            {navigation.map((item) => <SidebarLink key={item.path} item={item} collapsed={collapsed} onClose={onClose} />)}
          </nav>
          <p className={`mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>System</p>
          <nav className="space-y-1">
            {utilityNavigation.map((item) => <SidebarLink key={item.path} item={item} collapsed={collapsed} onClose={onClose} />)}
          </nav>
          <button onClick={onLogout} className={`group mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 ${collapsed ? 'lg:justify-center' : ''}`} title={collapsed ? 'Sign out' : undefined}>
            <LogOut size={18} strokeWidth={2} />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
        <div className={`m-3 rounded-2xl bg-teal-50 p-3 ${collapsed ? 'lg:hidden' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-600"><AlarmClock size={17} /></div>
            <div><p className="text-xs font-bold text-teal-700">Need help?</p><p className="text-[11px] text-teal-600/70">Talk to support</p></div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ item, collapsed, onClose }: { item: MenuItem; collapsed: boolean; onClose: () => void }) {
  const Icon = item.icon
  return <NavLink to={item.path} onClick={onClose} title={collapsed ? item.label : undefined} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${collapsed ? 'lg:justify-center' : ''} ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}><Icon size={18} strokeWidth={2} /><span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span></NavLink>
}

function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const current = [...navigation, ...utilityNavigation].find((item) => item.path === location.pathname)
  const [profile] = useState<{ name?: string; role?: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('dentahub_user') ?? 'null') } catch { return null }
  })
  const profileName = profile?.name || 'User'
  const profileRole = profile?.role || 'Team member'
  const initials = profileName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return <header className="flex h-[88px] items-center justify-between gap-4 border-b border-slate-100 bg-cream/90 px-4 backdrop-blur sm:px-6 lg:px-10"><div className="flex items-center gap-3"><button onClick={onMenu} aria-label="Open navigation" className="rounded-xl border border-slate-200 bg-white p-2.5 text-muted lg:hidden"><Menu size={19} /></button><div><p className="text-xs font-medium text-muted">Pages / <span className="text-teal-700">{current?.label ?? 'Dashboard'}</span></p><h1 className="heading-font mt-1 text-xl font-extrabold text-ink sm:text-2xl">{current?.label ?? 'Dashboard'}</h1></div></div><div className="flex items-center gap-2 sm:gap-4"><div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-muted shadow-sm md:flex"><Search size={16} /><input className="w-36 bg-transparent outline-none placeholder:text-slate-400" placeholder="Search anything..." /></div><button aria-label="Notifications" className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-muted shadow-sm transition hover:text-teal-700"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-coral ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-white"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700">{initials || 'U'}</div><span className="hidden text-left sm:block"><span className="block text-xs font-bold text-ink">{profileName}</span><span className="block text-[10px] text-muted">{profileRole}</span></span><ChevronDown size={15} className="hidden text-muted sm:block" /></button></div></header>
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.message ?? 'Unable to sign in. Please check your credentials.')
      }

      localStorage.setItem('dentahub_token', payload.token)
      localStorage.setItem('dentahub_user', JSON.stringify(payload.user))
      onLogin()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <section className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-[#087f8c] via-[#0c9098] to-[#46b7ac] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Stethoscope size={23} /></span>
          <div><p className="heading-font text-xl font-extrabold">Denta<span className="text-teal-100">Hub</span></p><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-50/70">Care, made simple</p></div>
        </div>
        <div className="relative z-10 max-w-md pb-10"><p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-teal-50/70">Your clinic, connected</p><h1 className="heading-font text-4xl font-extrabold leading-tight">Make every patient visit feel effortless.</h1><p className="mt-5 text-sm leading-7 text-teal-50/80">Manage your patients, appointments, clinical notes, treatments, and payments from one calm workspace.</p></div>
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full border-[50px] border-white/10" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[35px] border-white/10" />
        <div className="absolute bottom-16 right-16 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"><Stethoscope size={72} strokeWidth={1} className="text-white/60" /></div>
      </section>
      <section className="flex flex-1 items-center justify-center bg-cream px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white"><Stethoscope size={20} /></span><span className="heading-font text-xl font-extrabold text-ink">Denta<span className="text-teal-600">Hub</span></span></div></div>
          <div className="mb-8"><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><LockKeyhole size={22} /></span><h2 className="heading-font text-2xl font-extrabold text-ink sm:text-3xl">Welcome back</h2><p className="mt-2 text-sm text-muted">Sign in to continue to your clinic workspace.</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block"><span className="mb-2 block text-xs font-bold text-ink">Email address</span><span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><Mail size={17} className="text-muted" /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400" placeholder="you@clinic.com" /></span></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-ink">Password</span><span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><LockKeyhole size={17} className="text-muted" /><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400" placeholder="Enter your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="text-xs font-bold text-muted hover:text-teal-700">{showPassword ? 'Hide' : 'Show'}</button></span></label>
            {error && <p className="rounded-xl bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in to DentaHub'}<span className="ml-2">→</span></button>
          </form>
          <p className="mt-8 text-center text-xs text-muted">Need access? Contact your clinic administrator.</p>
        </div>
      </section>
    </div>
  )
}

function Dashboard() {
  const [summary, setSummary] = useState<Summary>(initialSummary)
  const [loading, setLoading] = useState(true)

  const formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${summary.date}T00:00:00`))
  const greeting = getGreeting()

  useEffect(() => {
    apiGet<Summary>('/api/dashboard/summary')
      .then((data) => setSummary(data))
      .catch(() => setSummary(initialSummary))
      .finally(() => setLoading(false))
  }, [])

  return <div className="space-y-7 py-7"><section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#087f8c] via-[#0c9098] to-[#46b7ac] px-6 py-7 text-white shadow-lg shadow-teal-600/10 sm:px-8 sm:py-8"><div className="relative z-10 max-w-xl"><p className="mb-2 text-sm font-medium text-teal-50/80">{formattedDate}</p><h2 className="heading-font text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting} <span className="inline-block">👋</span></h2><p className="mt-3 max-w-md text-sm leading-6 text-teal-50/80">Here is what is happening at your clinic today. You have <span className="font-bold text-white">{summary.todayAppointments} appointments</span> scheduled.</p></div><div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[42px] border-white/10" /><div className="absolute -bottom-28 right-36 h-56 w-56 rounded-full border-[28px] border-white/10" /><div className="absolute bottom-6 right-8 hidden rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm md:block"><Stethoscope size={58} strokeWidth={1.2} className="text-white/70" /></div></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total Patients" value={summary.totalPatients.toLocaleString()} caption="Live clinic total" icon={UsersRound} tone="teal" loading={loading} /><StatCard label="Today's Appointments" value={summary.todayAppointments} caption="Scheduled for today" icon={CalendarDays} tone="blue" loading={loading} /><StatCard label="Total Doctors" value={summary.totalDoctors} caption="Registered clinicians" icon={Stethoscope} tone="violet" loading={loading} /><StatCard label="Total Branches" value={summary.totalBranches} caption="Configured locations" icon={CircleDollarSign} tone="orange" loading={loading} /></section><section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]"><Appointments appointments={summary.appointments} /><QuickActions /></section></div>
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ label, value, caption, icon: Icon, tone, loading }: { label: string; value: string | number; caption: string; icon: IconType; tone: 'teal' | 'blue' | 'violet' | 'orange'; loading: boolean }) {
  const styles = { teal: 'bg-teal-50 text-teal-600', blue: 'bg-blue-50 text-blue-500', violet: 'bg-violet-50 text-violet-500', orange: 'bg-orange-50 text-orange-500' }
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted">{label}</p><p className="heading-font mt-2 text-2xl font-extrabold tracking-tight text-ink">{loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-slate-100" /> : value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon size={19} /></span></div><div className="mt-5 text-[11px] text-muted">{caption}</div></div>
}

function Appointments({ appointments }: { appointments: Summary['appointments'] }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6"><div><h3 className="heading-font text-base font-extrabold text-ink">Today's appointments</h3><p className="mt-1 text-xs text-muted">Keep an eye on your clinic schedule</p></div>{appointments.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-muted">No appointments scheduled for today.</div> : <div className="mt-5 divide-y divide-slate-100">{appointments.map((appointment) => <div key={`${appointment.appointmentDateTime}-${appointment.patient}`} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><div className="w-[66px] shrink-0 text-xs font-bold text-ink">{new Date(appointment.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div className="h-9 w-9 shrink-0 rounded-xl bg-[#dff3f0] p-2 text-teal-700"><UserRound size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{appointment.patient}</p><p className="mt-0.5 truncate text-[11px] text-muted">{appointment.appointmentType} · {appointment.doctor}</p></div><StatusBadge status={appointment.status} /></div>)}</div>}</div>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string[]> = { scheduled: ['Scheduled', 'bg-blue-50 text-blue-600'], confirmed: ['Confirmed', 'bg-emerald-50 text-emerald-600'], completed: ['Completed', 'bg-teal-50 text-teal-700'], cancelled: ['Cancelled', 'bg-rose-50 text-rose-600'], no_show: ['No show', 'bg-slate-100 text-slate-500'] }
  const value = config[status.toLowerCase()] ?? ['Scheduled', 'bg-slate-100 text-slate-500']
  return <span className={`hidden rounded-md px-2 py-1 text-[10px] font-bold sm:block ${value[1]}`}>{value[0]}</span>
}

function QuickActions() {
  const actions = [{ label: 'Add new patient', description: 'Create a patient profile', icon: UserRound, color: 'bg-teal-50 text-teal-600' }, { label: 'Schedule appointment', description: 'Book a new appointment', icon: CalendarDays, color: 'bg-blue-50 text-blue-500' }, { label: 'Start consultation', description: 'Open clinical workspace', icon: MessageSquareMore, color: 'bg-violet-50 text-violet-500' }]
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6"><div><h3 className="heading-font text-base font-extrabold text-ink">Quick actions</h3><p className="mt-1 text-xs text-muted">Common tasks, right at your fingertips</p></div><div className="mt-5 space-y-3">{actions.map(({ label, description, icon: Icon, color }) => <button key={label} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-teal-100 hover:bg-teal-50/40"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></span><span className="flex-1"><span className="block text-xs font-bold text-ink">{label}</span><span className="mt-1 block text-[11px] text-muted">{description}</span></span><span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600">→</span></button>)}</div></div>
}

function ComingSoonPage({ label, icon: Icon }: { label: string; icon: IconType }) {
  return <div className="flex min-h-[calc(100vh-88px)] items-center justify-center py-10"><div className="max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-soft"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Icon size={29} /></span><h2 className="heading-font mt-5 text-xl font-extrabold text-ink">{label}</h2><p className="mt-2 text-sm leading-6 text-muted">This workspace is ready for the next module. The navigation and application shell are in place.</p><span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">Module coming next</span></div></div>
}

export default App
