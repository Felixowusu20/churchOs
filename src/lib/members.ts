export function formatMemberDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const memberGenders = ['Male', 'Female', 'Other']

export const memberDepartments = [
  'Choir',
  'Ushers',
  'Youth Ministry',
  "Children's Ministry",
  "Men's Fellowship",
  "Women's Fellowship",
  'Evangelism',
  'General',
]

export const teachingClasses = [
  'Beginners',
  'Primary',
  'Junior',
  'Intermediate',
  'Youth',
  'Adult',
  'New Converts',
  'Leadership',
]

export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated']
