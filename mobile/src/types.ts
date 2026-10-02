export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  clinicName: string
  permissions: string[]
  branchId?: number | null
  branchScoped?: boolean
}

export type LoginResponse = {
  token: string
  user: AuthUser
}

export type DashboardSummary = {
  date: string
  branchId: number | null
  totalPatients: number
  todayAppointments: number
  totalDoctors: number
  totalBranches: number
  totalBilled: number
  totalCollected: number
  totalOutstanding: number
  appointments: Array<{
    appointmentDateTime: string
    patient: string
    doctor: string
    appointmentType: string
    status: string
  }>
}

export type Patient = {
  id: number
  fullName: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  gender: string | null
  status: string
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
  walkIn: boolean
  queuePosition: number | null
  checkedInAt: string | null
}
