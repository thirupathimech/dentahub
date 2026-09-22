export type MenuPermission = {
  key: string
  label: string
  group: 'Workspace' | 'Administration'
}

export const MENU_PERMISSIONS: MenuPermission[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Workspace' },
  { key: 'patients', label: 'Patients', group: 'Workspace' },
  { key: 'appointments', label: 'Appointments', group: 'Workspace' },
  { key: 'doctors', label: 'Doctors', group: 'Workspace' },
  { key: 'consultation', label: 'Consultation', group: 'Workspace' },
  { key: 'dental-chart', label: 'Dental Chart', group: 'Workspace' },
  { key: 'treatment-plans', label: 'Treatment Plans', group: 'Workspace' },
  { key: 'treatments', label: 'Treatments', group: 'Workspace' },
  { key: 'billing', label: 'Billing', group: 'Workspace' },
  { key: 'payments', label: 'Payments', group: 'Workspace' },
  { key: 'users-roles', label: 'Users / Roles', group: 'Administration' },
  { key: 'branch', label: 'Branch', group: 'Administration' },
  { key: 'settings', label: 'Settings', group: 'Administration' },
]

export const ALL_PERMISSION_KEYS = MENU_PERMISSIONS.map((permission) => permission.key)
