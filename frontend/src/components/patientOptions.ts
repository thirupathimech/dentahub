import type { Patient } from '../api'
import type { AutocompleteOption } from './AutocompleteField'

export function patientOption(patient: Patient): AutocompleteOption {
  const details = [patient.phone, `Patient ID #${patient.id}`, patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : ''].filter(Boolean)
  return { value: String(patient.id), label: patient.fullName, description: details.join(' · ') }
}

export function patientIdentity(patient: Patient | undefined): string {
  if (!patient) return 'Selected patient'
  return `${patient.fullName} · ${patient.phone} · Patient ID #${patient.id}`
}
