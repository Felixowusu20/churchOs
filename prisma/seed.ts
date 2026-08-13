import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const events = [
  {
    code: 'EVT-001',
    title: 'Sunday Morning Service',
    type: 'Service',
    dateLabel: 'Jul 28, 2026',
    timeLabel: '9:00 AM – 12:00 PM',
    venue: 'Main Auditorium',
    capacity: 2000,
    registered: 1200,
    color: '#1F2D4D',
    bg: '#F0EBE3',
    status: 'Live',
    biometric: true,
  },
  {
    code: 'EVT-002',
    title: 'Youth Leadership Conference',
    type: 'Conference',
    dateLabel: 'Aug 2–3, 2026',
    timeLabel: '10:00 AM – 6:00 PM',
    venue: 'Conference Hall B',
    capacity: 500,
    registered: 328,
    color: '#5B4B8A',
    bg: '#F3F0F8',
    status: 'Upcoming',
    biometric: true,
  },
  {
    code: 'EVT-003',
    title: '3-Day Prayer & Fasting',
    type: 'Prayer',
    dateLabel: 'Aug 5–7, 2026',
    timeLabel: '6:00 AM – 8:00 PM',
    venue: 'Main Auditorium',
    capacity: 1000,
    registered: 682,
    color: '#2F6B4F',
    bg: '#E8F2EC',
    status: 'Upcoming',
    biometric: false,
  },
  {
    code: 'EVT-004',
    title: 'Annual Thanksgiving Service',
    type: 'Service',
    dateLabel: 'Aug 10, 2026',
    timeLabel: '9:30 AM – 2:00 PM',
    venue: 'Main Auditorium',
    capacity: 2000,
    registered: 1500,
    color: '#9A7B4F',
    bg: '#F5F0E8',
    status: 'Upcoming',
    biometric: true,
  },
  {
    code: 'EVT-005',
    title: "Women's Empowerment Summit",
    type: 'Conference',
    dateLabel: 'Jul 20, 2026',
    timeLabel: '10:00 AM – 4:00 PM',
    venue: 'Fellowship Hall',
    capacity: 300,
    registered: 287,
    color: '#8B5A6B',
    bg: '#F8F0F3',
    status: 'Completed',
    biometric: true,
  },
  {
    code: 'EVT-006',
    title: 'Easter Crusade',
    type: 'Crusade',
    dateLabel: 'Apr 5, 2026',
    timeLabel: '9:00 AM – 6:00 PM',
    venue: 'Open Field',
    capacity: 5000,
    registered: 4218,
    color: '#B54A3F',
    bg: '#F8EDE9',
    status: 'Completed',
    biometric: false,
  },
]

const sampleIncome = [
  { category: 'Tithe', amount: 240, memberName: 'Akosua Boateng', method: 'Cash', status: 'Verified', daysAgo: 0 },
  { category: 'Offering', amount: 80, memberName: 'Richard Antwi', method: 'Mobile Money', status: 'Verified', daysAgo: 0 },
  { category: 'Building Fund', amount: 500, memberName: 'Emmanuel Osei', method: 'Bank Transfer', status: 'Pending', daysAgo: 0 },
  { category: 'Thanksgiving', amount: 150, memberName: 'Ama Darko', method: 'Cash', status: 'Verified', daysAgo: 0 },
  { category: 'Tithe', amount: 320, memberName: 'Kofi Frimpong', method: 'Bank Transfer', status: 'Verified', daysAgo: 0 },
  { category: 'Welfare Fund', amount: 100, memberName: 'Gifty Adjei', method: 'Cash', status: 'Verified', daysAgo: 1 },
]

const sampleExpenses = [
  { category: 'Personnel', description: 'Staff Salaries', amount: 22000, approvedBy: 'Rev. J. Mensah', daysAgo: 0 },
  { category: 'Utilities', description: 'Electricity Bill', amount: 1240, approvedBy: 'Elder K. Boateng', daysAgo: 2 },
  { category: 'Programs', description: 'Youth Program Supplies', amount: 3800, approvedBy: 'Elder K. Boateng', daysAgo: 5 },
  { category: 'Maintenance', description: 'Projector Maintenance', amount: 850, approvedBy: 'Deacon T. Asante', daysAgo: 7 },
]

async function main() {
  const seedDepartments = [
    { name: 'Choir', leaderName: 'Akosua Boateng', description: 'Worship team leading praise every Sunday.', meetingDay: 'Wednesday', meetingTime: '6:00 PM', color: '#7C3AED', bg: '#F5F3FF' },
    { name: 'Ushers', leaderName: 'Kwame Asante', description: 'Welcoming guests and managing service flow.', meetingDay: 'Sunday', meetingTime: '8:00 AM', color: '#1F2D4D', bg: '#F0EBE3' },
    { name: 'Youth Ministry', leaderName: 'Emmanuel Osei', description: 'Faith and leadership for the next generation.', meetingDay: 'Saturday', meetingTime: '4:00 PM', color: '#F59E0B', bg: '#FFFBEB' },
    { name: "Children's Ministry", leaderName: 'Gifty Adjei', description: 'Age-appropriate teaching for children.', meetingDay: 'Sunday', meetingTime: '9:00 AM', color: '#EC4899', bg: '#FDF2F8' },
    { name: "Men's Fellowship", leaderName: 'Richard Antwi', description: 'Building men of character and faith.', meetingDay: 'First Friday', meetingTime: '7:00 PM', color: '#059669', bg: '#ECFDF5' },
    { name: "Women's Fellowship", leaderName: 'Abena Mensah', description: 'Supporting women in faith and purpose.', meetingDay: 'Thursday', meetingTime: '5:30 PM', color: '#DB2777', bg: '#FDF2F8' },
    { name: 'Evangelism', leaderName: 'Kofi Frimpong', description: 'Outreach, crusades, and community witness.', meetingDay: 'Tuesday', meetingTime: '6:30 PM', color: '#0891B2', bg: '#ECFEFF' },
    { name: 'Bible Study', leaderName: 'Pastor Yaw Darko', description: 'Systematic Word study and small groups.', meetingDay: 'Wednesday', meetingTime: '7:00 PM', color: '#92400E', bg: '#FFFBEB' },
    { name: 'General', leaderName: '', description: 'Default assignment when no ministry is selected.', meetingDay: '', meetingTime: '', color: '#5C6578', bg: '#F3F1EE' },
  ]

  const deptByName = new Map<string, string>()
  for (const dept of seedDepartments) {
    const slug = dept.name
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const row = await prisma.department.upsert({
      where: { name: dept.name },
      update: {
        description: dept.description,
        leaderName: dept.leaderName,
        meetingDay: dept.meetingDay,
        meetingTime: dept.meetingTime,
        color: dept.color,
        bg: dept.bg,
        status: 'Active',
      },
      create: {
        name: dept.name,
        slug,
        description: dept.description,
        leaderName: dept.leaderName,
        meetingDay: dept.meetingDay,
        meetingTime: dept.meetingTime,
        color: dept.color,
        bg: dept.bg,
        status: 'Active',
      },
    })
    deptByName.set(dept.name, row.id)
  }
  console.log(`Seeded ${seedDepartments.length} departments`)

  for (const event of events) {
    await prisma.churchEvent.upsert({
      where: { code: event.code },
      update: { ...event },
      create: { ...event },
    })
  }

  const incomeCount = await prisma.financeEntry.count({ where: { kind: 'INCOME' } })
  if (incomeCount === 0) {
    for (const row of sampleIncome) {
      const occurredAt = new Date()
      occurredAt.setDate(occurredAt.getDate() - row.daysAgo)
      await prisma.financeEntry.create({
        data: {
          kind: 'INCOME',
          category: row.category,
          amount: row.amount,
          memberName: row.memberName,
          method: row.method,
          status: row.status,
          occurredAt,
        },
      })
    }
  }

  const expenseCount = await prisma.financeEntry.count({ where: { kind: 'EXPENSE' } })
  if (expenseCount === 0) {
    for (const row of sampleExpenses) {
      const occurredAt = new Date()
      occurredAt.setDate(occurredAt.getDate() - row.daysAgo)
      await prisma.financeEntry.create({
        data: {
          kind: 'EXPENSE',
          category: row.category,
          description: row.description,
          amount: row.amount,
          approvedBy: row.approvedBy,
          status: 'Verified',
          occurredAt,
        },
      })
    }
  }

  console.log(`Seeded ${events.length} events`)
  console.log('Finance sample rows ensured')

  const memberCount = await prisma.member.count()
  if (memberCount === 0) {
    const seedMembers = [
      {
        memberCode: 'GC-001247',
        fullName: 'Akosua Boateng',
        gender: 'Female',
        dob: new Date('1992-04-18'),
        phone: '+233 24 123 4567',
        address: '12 Liberation Rd, Accra',
        teachingClass: 'Adult',
        department: 'Choir',
        baptized: true,
        dateJoined: new Date('2022-01-12'),
        occupation: 'Teacher',
        maritalStatus: 'Married',
        emergencyContact: 'Kofi Boateng · +233 24 555 0101',
        fingerprintEnrolled: true,
      },
      {
        memberCode: 'GC-001248',
        fullName: 'Kwame Asante',
        gender: 'Male',
        dob: new Date('1988-09-02'),
        phone: '+233 20 987 6543',
        address: '45 Spintex Road, Accra',
        teachingClass: 'Adult',
        department: 'Ushers',
        baptized: true,
        dateJoined: new Date('2021-03-05'),
        occupation: 'Engineer',
        maritalStatus: 'Married',
        emergencyContact: 'Ama Asante · +233 20 111 2233',
        fingerprintEnrolled: true,
      },
      {
        memberCode: 'GC-001249',
        fullName: 'Ama Darko',
        gender: 'Female',
        dob: new Date('2005-11-21'),
        phone: '+233 26 555 1234',
        address: 'East Legon, Accra',
        teachingClass: 'Youth',
        department: 'Youth Ministry',
        baptized: false,
        dateJoined: new Date('2023-06-18'),
        occupation: 'Student',
        maritalStatus: 'Single',
        emergencyContact: 'Mrs Darko · +233 26 900 1122',
        fingerprintEnrolled: false,
      },
      {
        memberCode: 'GC-001250',
        fullName: 'Emmanuel Osei',
        gender: 'Male',
        dob: new Date('1985-01-30'),
        phone: '+233 27 444 8899',
        address: 'Kaneshie, Accra',
        teachingClass: 'Adult',
        department: "Men's Fellowship",
        baptized: true,
        dateJoined: new Date('2020-09-09'),
        occupation: 'Business owner',
        maritalStatus: 'Married',
        emergencyContact: 'Efua Osei · +233 27 333 7788',
        fingerprintEnrolled: true,
      },
      {
        memberCode: 'GC-001251',
        fullName: 'Abena Mensah',
        gender: 'Female',
        dob: new Date('1979-07-14'),
        phone: '+233 24 777 3322',
        address: 'Madina, Accra',
        teachingClass: 'Adult',
        department: "Women's Fellowship",
        baptized: true,
        dateJoined: new Date('2019-11-14'),
        occupation: 'Nurse',
        maritalStatus: 'Widowed',
        emergencyContact: 'Yaw Mensah · +233 24 222 3344',
        status: 'Inactive',
        fingerprintEnrolled: true,
      },
      {
        memberCode: 'GC-001252',
        fullName: 'Kofi Frimpong',
        gender: 'Male',
        dob: new Date('1994-02-08'),
        phone: '+233 23 666 4455',
        address: 'Tema Community 5',
        teachingClass: 'New Converts',
        department: 'Evangelism',
        baptized: true,
        dateJoined: new Date('2024-02-28'),
        occupation: 'Trader',
        maritalStatus: 'Single',
        emergencyContact: 'Ama Frimpong · +233 23 100 2000',
        fingerprintEnrolled: true,
      },
    ]

    for (const m of seedMembers) {
      await prisma.member.create({
        data: {
          ...m,
          departmentId: deptByName.get(m.department) ?? null,
        },
      })
    }
    console.log(`Seeded ${seedMembers.length} members`)
  } else {
    console.log(`Members already present (${memberCount})`)
    // Link existing members to department rows by name
    for (const [name, id] of deptByName) {
      await prisma.member.updateMany({
        where: { department: name, departmentId: null },
        data: { departmentId: id },
      })
    }
  }

  // Homepage CMS
  const { defaultHomepageContent } = await import('../src/lib/homepage')
  const homepage = await prisma.siteContent.findUnique({ where: { key: 'homepage' } })
  if (!homepage) {
    await prisma.siteContent.create({
      data: { key: 'homepage', content: defaultHomepageContent() },
    })
    console.log('Seeded homepage CMS content')
  } else {
    console.log('Homepage CMS already present')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
