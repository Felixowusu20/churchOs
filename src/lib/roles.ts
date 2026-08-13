/** Role-based access for ChurchOS admin portal */

export const ADMIN_ROLES = [
  'Super Admin',
  'Secretary',
  'Finance Minister',
  'Organizer',
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export type AppPage =
  | 'dashboard'
  | 'members'
  | 'attendance'
  | 'finance'
  | 'events'
  | 'departments'
  | 'reports'
  | 'settings'

export type FinanceAccess = 'full' | 'input' | 'none' | 'reports'

export type RoleDefinition = {
  role: AdminRole
  label: string
  description: string
  pages: AppPage[]
  home: AppPage
  financeAccess: FinanceAccess
  canManageStaff: boolean
  color: string
}

export const SUB_ADMIN_ROLES: AdminRole[] = ['Secretary', 'Finance Minister', 'Organizer']

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  'Super Admin': {
    role: 'Super Admin',
    label: 'Super Admin',
    description: 'Full access — members, finance, events, reports, and staff credentials.',
    pages: ['dashboard', 'members', 'finance', 'events', 'departments', 'reports', 'settings'],
    home: 'dashboard',
    financeAccess: 'full',
    canManageStaff: true,
    color: '#B54A3F',
  },
  Secretary: {
    role: 'Secretary',
    label: 'Secretary',
    description:
      'Record keeping — members, departments, tithes & expense entries, plus reports. No finance dashboard.',
    pages: ['members', 'departments', 'finance', 'reports'],
    home: 'members',
    financeAccess: 'input',
    canManageStaff: false,
    color: '#1F2D4D',
  },
  'Finance Minister': {
    role: 'Finance Minister',
    label: 'Finance Minister',
    description: 'Enter income and expense records only — no finance dashboard totals or charts.',
    pages: ['finance'],
    home: 'finance',
    financeAccess: 'input',
    canManageStaff: false,
    color: '#2F6B4F',
  },
  Organizer: {
    role: 'Organizer',
    label: 'Organizer',
    description: 'Create and manage events, including fingerprint check-in settings.',
    pages: ['events'],
    home: 'events',
    financeAccess: 'none',
    canManageStaff: false,
    color: '#9A7B4F',
  },
}

export function normalizeRole(role: string | null | undefined): AdminRole {
  const raw = (role || '').trim()
  if ((ADMIN_ROLES as readonly string[]).includes(raw)) return raw as AdminRole
  // Legacy / unknown privileged accounts stay as Super Admin
  if (!raw || /super/i.test(raw) || /admin/i.test(raw)) return 'Super Admin'
  return 'Super Admin'
}

export function getRoleDefinition(role: string | null | undefined): RoleDefinition {
  return ROLE_DEFINITIONS[normalizeRole(role)]
}

export function canAccessPage(role: string | null | undefined, page: AppPage) {
  return getRoleDefinition(role).pages.includes(page)
}

export function defaultHomePage(role: string | null | undefined): AppPage {
  return getRoleDefinition(role).home
}

export function canManageStaff(role: string | null | undefined) {
  return getRoleDefinition(role).canManageStaff
}

export function financeAccessFor(role: string | null | undefined): FinanceAccess {
  return getRoleDefinition(role).financeAccess
}

/** Only Super Admin may see finance KPI cards / charts. */
export function canViewFinanceDashboard(role: string | null | undefined) {
  return normalizeRole(role) === 'Super Admin'
}

export function defaultTitleForRole(role: AdminRole) {
  switch (role) {
    case 'Secretary':
      return 'Church Secretary'
    case 'Finance Minister':
      return 'Finance Minister'
    case 'Organizer':
      return 'Event Organizer'
    default:
      return 'Administrator'
  }
}
