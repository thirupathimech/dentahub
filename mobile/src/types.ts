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

export type ClinicSettings = {
  id?: number | null
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
  emailNotificationsEnabled: boolean
  emailProvider: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUsername: string | null
  smtpPasswordConfigured: boolean
  smtpEncryption: string | null
  emailFromName: string | null
  emailFromAddress: string | null
  logoDataUrl: string | null
}

export type PortalDoctor = { id: number; fullName: string; specialization: string; branchId: number | null }

export type PortalAppointment = {
  id: number
  patientId: number
  doctorName: string
  doctorId: number
  specialization: string
  appointmentDateTime: string
  appointmentEndDateTime: string
  appointmentType: string
  status: string
  notes: string | null
}

export type AdminOverview = {
  doctors: number
  branches: number
  users: number
  treatments: number
  invoices: number
  payments: number
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
  branchId: number | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  emergencyContact: string | null
  medicalNotes: string | null
  allergies: string | null
  medications: string | null
  medicalHistory: string | null
  status: string
  patientLoginEnabled: boolean
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

export type Consultation = {
  id: number
  patientId: number
  patientName: string
  doctorId: number
  doctorName: string
  branchId: number | null
  consultationDateTime: string
  chiefComplaint: string | null
  diagnosis: string | null
  clinicalFindings: string | null
  treatmentPlan: string | null
  notes: string | null
  status: string
}

export type ToothStatus = 'HEALTHY' | 'CARIES' | 'FILLED' | 'MISSING' | 'CROWN' | 'ROOT_CANAL' | 'IMPLANT' | 'FRACTURE'

export type DentalChart = {
  patientId: number
  patientName: string
  phone: string
  dateOfBirth: string | null
  gender: string | null
  branchId: number | null
  toothStatuses: Record<string, ToothStatus>
  notes: string | null
  updatedAt: string | null
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

export type Treatment = {
  id: number
  name: string
  category: string | null
  description: string | null
  durationMinutes: number | null
  price: number
  active: boolean
  branchId: number | null
}

export type TreatmentPlanItem = {
  id: number | null
  treatmentId: number
  treatmentName: string
  quantity: number
  unitPrice: number
}

export type TreatmentPlan = {
  id: number
  patientId: number
  patientName: string
  doctorId: number | null
  doctorName: string | null
  branchId: number | null
  title: string
  diagnosis: string | null
  status: string
  startDate: string | null
  targetDate: string | null
  notes: string | null
  treatments: TreatmentPlanItem[]
  estimatedTotal: number
}

export type BillingInvoiceItem = {
  id: number | null
  description: string
  quantity: number
  unitPrice: number
}

export type BillingInvoice = {
  id: number
  invoiceNumber: string
  patientId: number
  patientName: string
  branchId: number | null
  treatmentPlanId: number | null
  issueDate: string
  dueDate: string | null
  status: string
  discount: number
  tax: number
  notes: string | null
  items: BillingInvoiceItem[]
  subtotal: number
  total: number
  paidAmount: number
  balance: number
}

export type Payment = {
  id: number
  receiptNumber: string
  invoiceId: number
  invoiceNumber: string
  patientId: number
  patientName: string
  branchId: number | null
  paymentDate: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
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
  currency: string | null
  timezone: string | null
  appointmentDurationMinutes: number | null
  active: boolean
}

export type UserAccount = {
  id: number
  fullName: string
  email: string
  roleId: number | null
  roleName: string | null
  permissions: string[]
  branchId: number | null
  status: string
}

export type Role = {
  id: number
  name: string
  description: string | null
  permissions: string | null
  active: boolean
  branchScoped: boolean
  branchId: number | null
}

export type AvailableSlot = { startTime: string; endTime: string }

export type AppointmentConflict = {
  message: string
  availableSlots: AvailableSlot[]
}
