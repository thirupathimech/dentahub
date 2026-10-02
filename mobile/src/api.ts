import { Appointment, AuthUser, DashboardSummary, LoginResponse, Patient } from './types'

declare const process: { env: { EXPO_PUBLIC_API_BASE_URL?: string } }

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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
    throw new ApiError(payload?.message || `Request failed (${response.status})`, response.status)
  }
  return payload as T
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/api/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getDashboard(token: string) {
  return request<DashboardSummary>('/api/dashboard/summary', token)
}

export function getPatients(token: string, query = '') {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return request<Patient[]>(`/api/patients${suffix}`, token)
}

export function getAppointments(token: string, date = new Date()) {
  const dateValue = date.toISOString().slice(0, 10)
  return request<Appointment[]>(`/api/appointments?date=${dateValue}`, token)
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export type SessionUser = AuthUser
