const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('dentahub_token')
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
    throw new ApiRequestError(payload?.message ?? `Request failed with status ${response.status}`, response.status, payload)
  }
  return payload as T
}

export class ApiRequestError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.payload = payload
  }
}

export const apiGet = <T,>(path: string) => request<T>(path)
export const apiPost = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPut = <T,>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const apiDelete = (path: string) => request<void>(path, { method: 'DELETE' })

export type Patient = {
  id: number
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  emergencyContact: string | null
  medicalNotes: string | null
  status: string
}

export type Doctor = {
  id: number
  fullName: string
  specialization: string
  licenseNumber: string | null
  phone: string | null
  email: string | null
  branchId: number | null
  bio: string | null
  status: string
}

export type Branch = {
  id: number
  name: string
  code: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  active: boolean
}

export type Appointment = {
  id: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  appointmentDateTime: string
  appointmentEndDateTime: string
  appointmentType: string
  status: string
  notes: string | null
}

export type AppointmentConflict = {
  message: string
  conflicts: Array<{
    id: number
    patientId: number
    patientName: string
    doctorId: number
    doctorName: string
    appointmentDateTime: string
    appointmentEndDateTime: string
    reason: string
  }>
  availableSlots: Array<{ startTime: string; endTime: string }>
}

export type ClinicSettings = {
  id: number | null
  clinicName: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  currency: string | null
  timezone: string | null
  appointmentDurationMinutes: number | null
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  clinicName: string
  permissions: string[]
}
