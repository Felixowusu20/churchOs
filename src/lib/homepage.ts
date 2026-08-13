/** Homepage CMS content — public landing + admin editor share this shape. */

export type HomepageCtaAction = 'login' | 'check-in' | 'hash' | 'external'

export type HomepageCta = {
  label: string
  action: HomepageCtaAction
  href?: string
}

export type HeroSlide = {
  id: string
  brand: string
  headline: string
  subcopy: string
  primaryCta: HomepageCta
  secondaryCta: HomepageCta
  imageUrl: string
  /** Optional CSS gradient overlay when no image */
  gradient?: string
}

export type HomepageContent = {
  brand: string
  brandAccent: string
  logoUrl: string
  navLinks: { label: string; href: string }[]
  navSignInLabel: string
  navCheckInLabel: string
  navDemoLabel: string
  hero: {
    autoplayMs: number
    slides: HeroSlide[]
  }
  features: {
    title: string
    subtitle: string
    items: { icon: string; title: string; desc: string }[]
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: { title: string; desc: string }[]
  }
  testimonial: {
    quote: string
    attribution: string
  }
  pricing: {
    title: string
    subtitle: string
    plans: {
      name: string
      price: string
      period: string
      desc: string
      features: string[]
      cta: string
      highlight: boolean
    }[]
  }
  closingCta: {
    title: string
    body: string
    buttonLabel: string
  }
  footer: {
    tagline: string
    links: { label: string; href: string }[]
    copyright: string
  }
}

export const HOMEPAGE_FEATURE_ICONS = [
  'Fingerprint',
  'Users',
  'DollarSign',
  'Calendar',
  'BarChart3',
  'GitBranch',
] as const

export const defaultHomepageContent = (): HomepageContent => ({
  brand: 'Church',
  brandAccent: 'OS',
  logoUrl: '',
  navLinks: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ],
  navSignInLabel: 'Sign in',
  navCheckInLabel: 'Member check-in',
  navDemoLabel: 'Request a demo',
  hero: {
    autoplayMs: 6500,
    slides: [
      {
        id: 'slide-1',
        brand: 'ChurchOS',
        headline: 'Quiet tools for the people who keep the church running.',
        subcopy:
          'Attendance, members, and giving — designed for Sunday mornings, not software demos.',
        primaryCta: { label: 'Get started', action: 'login' },
        secondaryCta: { label: 'See how check-in works', action: 'hash', href: '#how-it-works' },
        imageUrl:
          'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1800&q=80',
        gradient:
          'radial-gradient(ellipse at 30% 20%, #2A3D68 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #9A7B4F33 0%, transparent 45%), linear-gradient(160deg, #141C2B 0%, #1F2D4D 55%, #243554 100%)',
      },
      {
        id: 'slide-2',
        brand: 'ChurchOS',
        headline: 'Fingerprint check-in that feels like hospitality.',
        subcopy:
          'Members arrive, place a finger, and you have an accurate count — without clipboards at the door.',
        primaryCta: { label: 'Open check-in', action: 'check-in' },
        secondaryCta: { label: 'Explore features', action: 'hash', href: '#features' },
        imageUrl:
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1800&q=80',
        gradient:
          'linear-gradient(160deg, #1a2438 0%, #1F2D4D 50%, #2F6B4F55 100%)',
      },
      {
        id: 'slide-3',
        brand: 'ChurchOS',
        headline: 'Giving and expenses your board can trust.',
        subcopy:
          'Tithes, offerings, and ministry spend in one ledger — clear enough to share on Monday morning.',
        primaryCta: { label: 'Request a demo', action: 'login' },
        secondaryCta: { label: 'View pricing', action: 'hash', href: '#pricing' },
        imageUrl:
          'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1800&q=80',
        gradient:
          'linear-gradient(160deg, #141C2B 0%, #243554 55%, #9A7B4F44 100%)',
      },
    ],
  },
  features: {
    title: 'Built for the work already on your desk',
    subtitle:
      'Fewer screens, clearer records, and a check-in flow members understand without training.',
    items: [
      {
        icon: 'Fingerprint',
        title: 'Attendance check-in',
        desc: 'Members check in with a fingerprint at the door. Accurate counts without clipboards or queues.',
      },
      {
        icon: 'Users',
        title: 'Member records',
        desc: 'Profiles, family links, ministry roles, and history — kept in one place your team can trust.',
      },
      {
        icon: 'DollarSign',
        title: 'Giving & expenses',
        desc: 'Tithes, offerings, and expenses with clear records for pastors, treasurers, and the board.',
      },
      {
        icon: 'Calendar',
        title: 'Events & services',
        desc: 'Plan services and gatherings, then see who attended without extra paperwork.',
      },
      {
        icon: 'BarChart3',
        title: 'Clear reporting',
        desc: 'Weekly attendance and monthly finances presented simply enough to share with leadership.',
      },
      {
        icon: 'GitBranch',
        title: 'Multiple campuses',
        desc: 'Run several branches from one account, with shared standards and separate views when you need them.',
      },
    ],
  },
  howItWorks: {
    title: 'Check-in in four quiet steps',
    subtitle:
      'No glowing scanners or confusing dashboards at the door — just a calm form for members arriving to worship.',
    steps: [
      { title: 'Enroll members', desc: 'Add details and capture fingerprints once during registration.' },
      { title: 'Open check-in', desc: 'Place a tablet or kiosk at the entrance before service begins.' },
      { title: 'Members arrive', desc: 'Each person places a finger — check-in takes a second.' },
      { title: 'Review later', desc: 'See who came, who was late, and export what you need.' },
    ],
  },
  testimonial: {
    quote:
      'We stopped passing attendance sheets. Sunday mornings feel more like hospitality again.',
    attribution: 'Rev. Emmanuel Asante · Grace Chapel',
  },
  pricing: {
    title: 'Straightforward pricing',
    subtitle: 'Thirty-day trial on every plan. Cancel anytime.',
    plans: [
      {
        name: 'Starter',
        price: '$49',
        period: '/mo',
        desc: 'For smaller congregations',
        features: ['Attendance check-in', 'Member records', 'Basic reports', 'Finance tracking', '1 campus'],
        cta: 'Get started',
        highlight: false,
      },
      {
        name: 'Growth',
        price: '$129',
        period: '/mo',
        desc: 'For growing churches',
        features: [
          'Everything in Starter',
          'Events & departments',
          'Advanced reports',
          'Up to 3 campuses',
          'Priority support',
        ],
        cta: 'Start free trial',
        highlight: true,
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        desc: 'For multi-campus ministries',
        features: ['Unlimited campuses', 'Custom integrations', 'Dedicated support', 'On-site training', 'SLA'],
        cta: 'Talk to us',
        highlight: false,
      },
    ],
  },
  closingCta: {
    title: 'Ready when your congregation is',
    body: 'Set up members, open check-in, and walk into Sunday with a clearer picture of who showed up.',
    buttonLabel: 'Open ChurchOS',
  },
  footer: {
    tagline: 'Church management, kept simple.',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
    copyright: '© 2026 ChurchOS',
  },
})

export function normalizeHomepageContent(raw: unknown): HomepageContent {
  const base = defaultHomepageContent()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Partial<HomepageContent>
  return {
    ...base,
    ...input,
    logoUrl: typeof input.logoUrl === 'string' ? input.logoUrl : base.logoUrl,
    navLinks: Array.isArray(input.navLinks) ? input.navLinks : base.navLinks,
    hero: {
      autoplayMs: input.hero?.autoplayMs ?? base.hero.autoplayMs,
      slides:
        Array.isArray(input.hero?.slides) && input.hero!.slides.length > 0
          ? input.hero!.slides.map((s, i) => ({
              ...base.hero.slides[Math.min(i, base.hero.slides.length - 1)],
              ...s,
              id: s.id || `slide-${i + 1}`,
              primaryCta: { ...base.hero.slides[0].primaryCta, ...s.primaryCta },
              secondaryCta: { ...base.hero.slides[0].secondaryCta, ...s.secondaryCta },
            }))
          : base.hero.slides,
    },
    features: {
      ...base.features,
      ...input.features,
      items: Array.isArray(input.features?.items) ? input.features!.items : base.features.items,
    },
    howItWorks: {
      ...base.howItWorks,
      ...input.howItWorks,
      steps: Array.isArray(input.howItWorks?.steps) ? input.howItWorks!.steps : base.howItWorks.steps,
    },
    testimonial: { ...base.testimonial, ...input.testimonial },
    pricing: {
      ...base.pricing,
      ...input.pricing,
      plans: Array.isArray(input.pricing?.plans) ? input.pricing!.plans : base.pricing.plans,
    },
    closingCta: { ...base.closingCta, ...input.closingCta },
    footer: {
      ...base.footer,
      ...input.footer,
      links: Array.isArray(input.footer?.links) ? input.footer!.links : base.footer.links,
    },
  }
}
