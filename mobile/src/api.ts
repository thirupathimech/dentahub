import { AdminOverview, Appointment, AppointmentConflict, AuthUser, BillingInvoice, Branch, ClinicSettings, Consultation, DashboardSummary, DentalChart, Doctor, LoginResponse, Patient, Payment, PortalAppointment, PortalDoctor, Role, Treatment, TreatmentPlan, UserAccount, ToothStatus } from './types'

declare const process: { env: { EXPO_PUBLIC_API_BASE_URL?: string } }

export const DEFAULT_API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080').replace(/\/$/, '')
let API_BASE_URL = DEFAULT_API_BASE_URL

export function configureApiBaseUrl(value: string | null | undefined) {
  API_BASE_URL = (value?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.message || `Request failed (${response.status})`, response.status, payload)
  }
  return payload as T
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/api/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function patientLogin(email: string, password: string) {
  return request<LoginResponse>('/api/auth/patient-login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getClinicSettings() {
  return request<ClinicSettings>('/api/settings')
}

export type ClinicSettingsPayload = {
  clinicName: string
  phone: string
  email: string | null
  address: string
  city: string
  state: string
  postalCode: string
  currency: string
  timezone: string
  appointmentDurationMinutes: number | null
  emailNotificationsEnabled: boolean
  emailProvider: string
  smtpHost: string
  smtpPort: number | null
  smtpUsername: string
  smtpPassword: string | null
  smtpEncryption: string
  emailFromName: string
  emailFromAddress: string | null
  logoDataUrl: string | null
}

export function updateClinicSettings(token: string, payload: ClinicSettingsPayload) {
  return request<ClinicSettings>('/api/settings', token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function getDashboard(token: string, date = new Date().toISOString().slice(0, 10)) {
  return request<DashboardSummary>(`/api/dashboard/summary?date=${encodeURIComponent(date)}`, token)
}

export function getPatients(token: string, query = '') {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return request<Patient[]>(`/api/patients${suffix}`, token)
}

export type PatientPayload = {
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  gender: string
  address: string
  emergencyContact: string
  medicalNotes: string
  allergies: string
  medications: string
  medicalHistory: string
  status: string
  password: string | null
}

export function createPatient(token: string, payload: PatientPayload) {
  return request<Patient>('/api/patients', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updatePatient(token: string, id: number, payload: PatientPayload) {
  return request<Patient>(`/api/patients/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deletePatient(token: string, id: number) {
  return request<void>(`/api/patients/${id}`, token, { method: 'DELETE' })
}

export function getDoctors(token: string) {
  return request<Doctor[]>('/api/doctors', token)
}

export function getBranches(token: string) {
  return request<Branch[]>('/api/branches', token)
}

export type BranchPayload = {
  name: string
  code: string
  phone: string
  email: string | null
  address: string
  city: string
  state: string
  postalCode: string
  currency: string
  timezone: string
  appointmentDurationMinutes: number | null
  active: boolean
}

export function createBranch(token: string, payload: BranchPayload) {
  return request<Branch>('/api/branches', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateBranch(token: string, id: number, payload: BranchPayload) {
  return request<Branch>(`/api/branches/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteBranch(token: string, id: number) {
  return request<void>(`/api/branches/${id}`, token, { method: 'DELETE' })
}

export function getUsers(token: string, query = '') {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return request<UserAccount[]>(`/api/users${suffix}`, token)
}

export type UserPayload = {
  fullName: string
  email: string
  password: string | null
  roleId: number | null
  branchId: number | null
  status: string
}

export function createUser(token: string, payload: UserPayload) {
  return request<UserAccount>('/api/users', token, { method: 'POST', body: JSON.stringify({ ...payload, password: payload.password ?? '' }) })
}

export function updateUser(token: string, id: number, payload: UserPayload) {
  return request<UserAccount>(`/api/users/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function transferUser(token: string, id: number, branchId: number | null) {
  return request<UserAccount>(`/api/users/${id}/transfer`, token, { method: 'POST', body: JSON.stringify({ branchId }) })
}

export function deleteUser(token: string, id: number) {
  return request<void>(`/api/users/${id}`, token, { method: 'DELETE' })
}

export function getRoles(token: string) {
  return request<Role[]>('/api/roles', token)
}

export type RolePayload = {
  name: string
  description: string | null
  permissions: string
  active: boolean
  branchScoped: boolean
  branchId: number | null
}

export function createRole(token: string, payload: RolePayload) {
  return request<Role>('/api/roles', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateRole(token: string, id: number, payload: RolePayload) {
  return request<Role>(`/api/roles/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteRole(token: string, id: number) {
  return request<void>(`/api/roles/${id}`, token, { method: 'DELETE' })
}

export type DoctorPayload = {
  fullName: string
  specialization: string
  licenseNumber: string
  phone: string
  email: string | null
  branchId: number | null
  bio: string
  status: string
}

export function createDoctor(token: string, payload: DoctorPayload) {
  return request<Doctor>('/api/doctors', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDoctor(token: string, id: number, payload: DoctorPayload) {
  return request<Doctor>(`/api/doctors/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteDoctor(token: string, id: number) {
  return request<void>(`/api/doctors/${id}`, token, { method: 'DELETE' })
}

export type ConsultationPayload = {
  patientId: number
  doctorId: number
  consultationDateTime: string
  chiefComplaint: string
  diagnosis: string
  clinicalFindings: string
  treatmentPlan: string
  notes: string
  status: string
}

export function getConsultations(token: string) {
  return request<Consultation[]>('/api/consultations', token)
}

export function createConsultation(token: string, payload: ConsultationPayload) {
  return request<Consultation>('/api/consultations', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateConsultation(token: string, id: number, payload: ConsultationPayload) {
  return request<Consultation>(`/api/consultations/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteConsultation(token: string, id: number) {
  return request<void>(`/api/consultations/${id}`, token, { method: 'DELETE' })
}

export function getDentalChart(token: string, patientId: number) {
  return request<DentalChart>(`/api/dental-charts/${patientId}`, token)
}

export function updateDentalChart(token: string, patientId: number, payload: { toothStatuses: Record<string, ToothStatus>; notes: string }) {
  return request<DentalChart>(`/api/dental-charts/${patientId}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function getTreatments(token: string, query = '') {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return request<Treatment[]>(`/api/treatments${suffix}`, token)
}

export type TreatmentPayload = {
  name: string
  category: string | null
  description: string | null
  durationMinutes: number | null
  price: number
  branchId: number | null
  active: boolean
}

export function createTreatment(token: string, payload: TreatmentPayload) {
  return request<Treatment>('/api/treatments', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateTreatment(token: string, id: number, payload: TreatmentPayload) {
  return request<Treatment>(`/api/treatments/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteTreatment(token: string, id: number) {
  return request<void>(`/api/treatments/${id}`, token, { method: 'DELETE' })
}

export function getTreatmentPlans(token: string) {
  return request<TreatmentPlan[]>('/api/treatment-plans', token)
}

export type TreatmentPlanPayload = {
  patientId: number
  doctorId: number | null
  title: string
  diagnosis: string | null
  status: string
  startDate: string | null
  targetDate: string | null
  notes: string | null
  treatments: Array<{ treatmentId: number; quantity: number }>
}

export function createTreatmentPlan(token: string, payload: TreatmentPlanPayload) {
  return request<TreatmentPlan>('/api/treatment-plans', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateTreatmentPlan(token: string, id: number, payload: TreatmentPlanPayload) {
  return request<TreatmentPlan>(`/api/treatment-plans/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteTreatmentPlan(token: string, id: number) {
  return request<void>(`/api/treatment-plans/${id}`, token, { method: 'DELETE' })
}

export function getInvoices(token: string) {
  return request<BillingInvoice[]>('/api/billing/invoices', token)
}

export type InvoicePayload = {
  patientId: number
  treatmentPlanId: number | null
  issueDate: string | null
  dueDate: string | null
  status: string
  discount: number
  tax: number
  notes: string | null
  items: Array<{ description: string; quantity: number; unitPrice: number }>
}

export function createInvoice(token: string, payload: InvoicePayload) {
  return request<BillingInvoice>('/api/billing/invoices', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateInvoice(token: string, id: number, payload: InvoicePayload) {
  return request<BillingInvoice>(`/api/billing/invoices/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteInvoice(token: string, id: number) {
  return request<void>(`/api/billing/invoices/${id}`, token, { method: 'DELETE' })
}

export function getPayments(token: string) {
  return request<Payment[]>('/api/payments', token)
}

export type PaymentPayload = {
  invoiceId: number
  paymentDate: string | null
  amount: number
  method: string
  reference: string | null
  notes: string | null
}

export function createPayment(token: string, payload: PaymentPayload) {
  return request<Payment>('/api/payments', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function deletePayment(token: string, id: number) {
  return request<void>(`/api/payments/${id}`, token, { method: 'DELETE' })
}

export function getAppointments(token: string, date: Date | string = new Date()) {
  const dateValue = typeof date === 'string' ? date : date.toISOString().slice(0, 10)
  return request<Appointment[]>(`/api/appointments?date=${dateValue}`, token)
}

export type AppointmentPayload = {
  patientId: number
  doctorId: number
  appointmentDateTime: string
  appointmentEndDateTime: string
  appointmentType: string
  status: string
  notes: string
  overrideConflict: boolean
  walkIn: boolean
}

export function createAppointment(token: string, payload: AppointmentPayload) {
  return request<Appointment>('/api/appointments', token, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAppointment(token: string, id: number, payload: AppointmentPayload) {
  return request<Appointment>(`/api/appointments/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteAppointment(token: string, id: number) {
  return request<void>(`/api/appointments/${id}`, token, { method: 'DELETE' })
}

export function checkInAppointment(token: string, id: number) {
  return request<Appointment>(`/api/appointments/${id}/check-in`, token, { method: 'POST', body: JSON.stringify({}) })
}

export function appointmentConflict(error: unknown): error is ApiError & { payload: AppointmentConflict } {
  if (!(error instanceof ApiError) || error.status !== 409 || !error.payload || typeof error.payload !== 'object') return false
  const payload = error.payload as Partial<AppointmentConflict>
  return Array.isArray(payload.availableSlots) && typeof payload.message === 'string'
}

export function getPatientPortalDoctors(token: string) {
  return request<PortalDoctor[]>('/api/patient-portal/doctors', token)
}

export function getPatientPortalAppointments(token: string) {
  return request<PortalAppointment[]>('/api/patient-portal/appointments', token)
}

export function getPatientPortalInvoices(token: string) {
  return request<BillingInvoice[]>('/api/patient-portal/invoices', token)
}

export function getPatientPortalPayments(token: string) {
  return request<Payment[]>('/api/patient-portal/payments', token)
}

export function bookPatientAppointment(token: string, payload: { doctorId: number; appointmentDateTime: string; appointmentEndDateTime: string; appointmentType: string; notes: string }) {
  return request<PortalAppointment>('/api/appointments/patient', token, { method: 'POST', body: JSON.stringify(payload) })
}

export async function getAdminOverview(token: string): Promise<AdminOverview> {
  const [doctors, branches, users, treatments, invoices, payments] = await Promise.all([
    request<unknown[]>('/api/doctors', token),
    request<unknown[]>('/api/branches', token),
    request<unknown[]>('/api/users', token),
    request<unknown[]>('/api/treatments', token),
    request<unknown[]>('/api/billing/invoices', token),
    request<unknown[]>('/api/payments', token),
  ])
  return { doctors: doctors.length, branches: branches.length, users: users.length, treatments: treatments.length, invoices: invoices.length, payments: payments.length }
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export type SessionUser = AuthUser
