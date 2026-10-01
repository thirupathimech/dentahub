import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Clock3, Globe2, ImagePlus, LockKeyhole, Mail, MapPin, Phone, Save, Settings2, Trash2 } from 'lucide-react'
import { apiGet, apiPut, ClinicSettings } from '../api'
import { ErrorState, LoadingState } from '../components/PageStates'

type SettingsForm = {
  clinicName: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  postalCode: string
  currency: string
  timezone: string
  appointmentDurationMinutes: string
  emailNotificationsEnabled: boolean
  emailProvider: string
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  smtpPasswordConfigured: boolean
  smtpEncryption: string
  emailFromName: string
  emailFromAddress: string
  logoDataUrl: string
}

const emptyForm: SettingsForm = {
  clinicName: '', phone: '', email: '', address: '', city: '', state: '', postalCode: '', currency: '', timezone: '', appointmentDurationMinutes: '',
  emailNotificationsEnabled: false, emailProvider: 'SMTP', smtpHost: '', smtpPort: '587', smtpUsername: '', smtpPassword: '', smtpPasswordConfigured: false,
  smtpEncryption: 'TLS', emailFromName: '', emailFromAddress: '', logoDataUrl: '',
}

const states = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Puducherry']
const currencies = ['INR · Indian Rupee', 'USD · US Dollar', 'EUR · Euro', 'GBP · Pound Sterling', 'AED · UAE Dirham', 'AUD · Australian Dollar', 'CAD · Canadian Dollar', 'SGD · Singapore Dollar']
const timezones = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC']
const emailProviders = ['SMTP', 'Gmail SMTP', 'Microsoft 365 SMTP', 'SendGrid SMTP']
const encryptionOptions = ['TLS', 'SSL', 'None']

function fromSettings(settings: ClinicSettings): SettingsForm {
  return {
    clinicName: settings.clinicName ?? '', phone: settings.phone ?? '', email: settings.email ?? '', address: settings.address ?? '', city: settings.city ?? '', state: settings.state ?? '', postalCode: settings.postalCode ?? '',
    currency: settings.currency ?? '', timezone: settings.timezone ?? '', appointmentDurationMinutes: settings.appointmentDurationMinutes?.toString() ?? '',
    emailNotificationsEnabled: settings.emailNotificationsEnabled ?? false, emailProvider: settings.emailProvider ?? 'SMTP', smtpHost: settings.smtpHost ?? '', smtpPort: settings.smtpPort?.toString() ?? '587',
    smtpUsername: settings.smtpUsername ?? '', smtpPassword: '', smtpPasswordConfigured: settings.smtpPasswordConfigured ?? false, smtpEncryption: settings.smtpEncryption ?? 'TLS',
    emailFromName: settings.emailFromName ?? '', emailFromAddress: settings.emailFromAddress ?? '', logoDataUrl: settings.logoDataUrl ?? '',
  }
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const update = (field: keyof SettingsForm, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }))
  const load = () => {
    setLoading(true)
    setError('')
    apiGet<ClinicSettings>('/api/settings')
      .then((settings) => setForm(fromSettings(settings)))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load settings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const result = await apiPut<ClinicSettings>('/api/settings', {
        ...form,
        appointmentDurationMinutes: form.appointmentDurationMinutes ? Number(form.appointmentDurationMinutes) : null,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
        smtpPassword: form.smtpPassword || null,
        logoDataUrl: form.logoDataUrl || null,
      })
      setForm(fromSettings(result))
      setSaved(true)
      window.dispatchEvent(new CustomEvent('dentahub:settings-updated', { detail: result }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (file.size > 1.5 * 1024 * 1024) { setError('Logo must be smaller than 1.5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, logoDataUrl: String(reader.result ?? '') }))
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="space-y-6 py-7"><LoadingState /></div>
  if (error && !form.clinicName) return <div className="space-y-6 py-7"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="space-y-6 py-7">
      <div><p className="text-sm text-muted">Configure the clinic profile, branding, email delivery, and appointment preferences.</p></div>
      <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
            <SectionHeader icon={<Settings2 size={19} />} color="bg-teal-50 text-teal-600" title="Clinic profile" description="These details appear throughout your clinic workspace." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field icon={<Settings2 size={15} />} label="Clinic name" required value={form.clinicName} onChange={(value) => update('clinicName', value)} />
              <Field icon={<Phone size={15} />} label="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
              <Field icon={<Mail size={15} />} label="Email" type="email" value={form.email} onChange={(value) => update('email', value)} />
              <Field icon={<MapPin size={15} />} label="Address" value={form.address} onChange={(value) => update('address', value)} />
              <AutocompleteField label="State" value={form.state} onChange={(value) => update('state', value)} options={states} />
              <Field label="City" value={form.city} onChange={(value) => update('city', value)} />
              <Field label="Postal code" value={form.postalCode} onChange={(value) => update('postalCode', value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
            <SectionHeader icon={<ImagePlus size={19} />} color="bg-violet-50 text-violet-600" title="Clinic logo" description="This logo is shown in the app toolbar and browser tab." />
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-teal-200 bg-teal-50 text-teal-600">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="Clinic logo preview" className="h-full w-full object-contain" /> : <ImagePlus size={24} />}</div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-ink hover:border-teal-300 hover:bg-teal-50"><ImagePlus size={15} /> Upload logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={uploadLogo} className="hidden" /></label>
                {form.logoDataUrl && <button type="button" onClick={() => update('logoDataUrl', '')} className="ml-2 inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 size={14} />Remove</button>}
                <p className="mt-2 text-[11px] text-muted">PNG, JPG, WEBP or SVG · max 1.5 MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6">
            <SectionHeader icon={<Clock3 size={19} />} color="bg-blue-50 text-blue-600" title="Appointment preferences" description="Set defaults for your scheduling workflow." />
            <div className="mt-5 space-y-4">
              <AutocompleteField label="Currency" value={form.currency} onChange={(value) => update('currency', value.split(' · ')[0])} options={currencies} placeholder="Search currency" />
              <AutocompleteField icon={<Globe2 size={15} />} label="Timezone" value={form.timezone} onChange={(value) => update('timezone', value)} options={timezones} placeholder="Search timezone" />
              <Field label="Default appointment duration (minutes)" type="number" min="1" value={form.appointmentDurationMinutes} onChange={(value) => update('appointmentDurationMinutes', value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6 xl:col-span-2">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader icon={<Mail size={19} />} color="bg-amber-50 text-amber-600" title="Email configuration" description="Configure SMTP delivery for reminders, receipts, and other clinic emails." />
            <label className="flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
              <input type="checkbox" checked={form.emailNotificationsEnabled} onChange={(event) => update('emailNotificationsEnabled', event.target.checked)} className="h-4 w-4 accent-teal-600" />
              <span><span className="block text-xs font-bold text-ink">Enable email notifications</span><span className="mt-0.5 block text-[11px] text-muted">{form.emailNotificationsEnabled ? 'Enabled' : 'Disabled'}</span></span>
            </label>
          </div>
          <fieldset disabled={!form.emailNotificationsEnabled} className="mt-5 space-y-5 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField label="Email provider" value={form.emailProvider} onChange={(value) => update('emailProvider', value)} options={emailProviders} />
              <Field label="SMTP host" required={form.emailNotificationsEnabled} value={form.smtpHost} onChange={(value) => update('smtpHost', value)} placeholder="smtp.example.com" />
              <Field label="SMTP port" required={form.emailNotificationsEnabled} type="number" min="1" value={form.smtpPort} onChange={(value) => update('smtpPort', value)} placeholder="587" />
              <SelectField label="Encryption" value={form.smtpEncryption} onChange={(value) => update('smtpEncryption', value)} options={encryptionOptions} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="SMTP username" value={form.smtpUsername} onChange={(value) => update('smtpUsername', value)} placeholder="notifications@clinic.com" />
              <Field label="SMTP password" type="password" value={form.smtpPassword} onChange={(value) => update('smtpPassword', value)} placeholder={form.smtpPasswordConfigured ? 'Leave blank to keep current password' : 'Enter SMTP password'} />
              <Field label="From name" value={form.emailFromName} onChange={(value) => update('emailFromName', value)} placeholder={form.clinicName || 'Your clinic'} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From email address" required={form.emailNotificationsEnabled} type="email" value={form.emailFromAddress} onChange={(value) => update('emailFromAddress', value)} placeholder="no-reply@clinic.com" />
            </div>
          </fieldset>
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] text-muted"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-teal-600" /><span>The SMTP password is never returned to the browser. Leave it blank while editing to keep the saved password unchanged.</span></div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs text-muted">Changes are saved to the clinic database.</p>{error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}{saved && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Settings saved</p>}</div>
            <button disabled={saving} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-60"><Save size={15} />{saving ? 'Saving...' : 'Save settings'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({ icon, color, title, description }: { icon: ReactNode; color: string; title: string; description: string }) {
  return <div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</span><div><h2 className="heading-font text-base font-extrabold text-ink">{title}</h2><p className="mt-1 text-xs text-muted">{description}</p></div></div>
}

function Field({ label, value, onChange, icon, type = 'text', required = false, placeholder = '', min, disabled = false }: { label: string; value: string; onChange: (value: string) => void; icon?: ReactNode; type?: string; required?: boolean; placeholder?: string; min?: string; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}{required && <span className="text-coral"> *</span>}</span><span className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 ${disabled ? 'cursor-not-allowed' : ''}`}>{icon && <span className="text-muted">{icon}</span>}<input disabled={disabled} required={required} min={min} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></span></label>
}

function SelectField({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10"><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm outline-none"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></span></label>
}

function AutocompleteField({ label, value, onChange, options, placeholder = '', icon }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder?: string; icon?: ReactNode }) {
  const listId = `autocomplete-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-ink">{label}</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">{icon && <span className="text-muted">{icon}</span>}<input list={listId} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></span><datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist></label>
}
