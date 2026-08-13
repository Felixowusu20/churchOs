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
    { label: 'For churches', href: '#for-churches' },
  ],
  navSignInLabel: 'Sign in',
  navCheckInLabel: 'Member check-in',
  navDemoLabel: 'Start for free',
  hero: {
    autoplayMs: 6500,
    slides: [
      {
        id: 'slide-1',
        brand: 'ChurchOS',
        headline: 'Quiet tools for the people who keep the church running.',
        subcopy:
          'Attendance, members, and giving — free for every congregation, built for Sunday mornings.',
        primaryCta: { label: 'Start for free', action: 'login' },
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
          'Tithes, offerings, and ministry spend in one ledger — free to use, clear enough to share on Monday morning.',
        primaryCta: { label: 'Start for free', action: 'login' },
        secondaryCta: { label: "What's included", action: 'hash', href: '#for-churches' },
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
    title: 'Free for every church',
    subtitle:
      'No subscriptions, no trials that expire, and no hidden fees. ChurchOS is given to congregations at no cost.',
    plans: [
      {
        name: 'For churches',
        price: 'Free',
        period: 'forever',
        desc: 'Everything your church needs to run Sundays with a clearer record — at no charge.',
        features: [
          'Attendance check-in',
          'Member records',
          'Giving and expenses',
          'Events and departments',
          'Reports for leadership',
          'As many campuses as you need',
        ],
        cta: 'Start for free',
        highlight: true,
      },
    ],
  },
  closingCta: {
    title: 'Ready when your congregation is',
    body: 'Set up members, open check-in, and walk into Sunday with a clearer picture of who showed up — free for your church.',
    buttonLabel: 'Start for free',
  },
  footer: {
    tagline: 'Church management, given freely to congregations.',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'For churches', href: '#for-churches' },
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

  const navLinks = (Array.isArray(input.navLinks) ? input.navLinks : base.navLinks).map((link) =>
    /pricing/i.test(link.label) || link.href === '#pricing'
      ? { label: 'For churches', href: '#for-churches' }
      : link,
  )

  const storedPricing = input.pricing
  const paidBlob = storedPricing
    ? `${storedPricing.title} ${storedPricing.subtitle} ${(storedPricing.plans || [])
        .map((p) => `${p.price} ${p.period} ${p.cta}`)
        .join(' ')}`
    : ''
  const looksPaid = /\$\d|\/mo|trial|enterprise|starter/i.test(paidBlob)
  const pricing = looksPaid
    ? base.pricing
    : {
        ...base.pricing,
        ...storedPricing,
        plans:
          Array.isArray(storedPricing?.plans) && storedPricing!.plans.length > 0
            ? storedPricing!.plans.map((p) => ({ ...base.pricing.plans[0], ...p, price: 'Free', period: p.period || 'forever' }))
            : base.pricing.plans,
      }

  const navDemoLabel =
    /demo/i.test(input.navDemoLabel || '') ? base.navDemoLabel : input.navDemoLabel || base.navDemoLabel

  return {
    ...base,
    ...input,
    logoUrl: typeof input.logoUrl === 'string' ? input.logoUrl : base.logoUrl,
    navLinks,
    navDemoLabel,
    hero: {
      autoplayMs: input.hero?.autoplayMs ?? base.hero.autoplayMs,
      slides:
        Array.isArray(input.hero?.slides) && input.hero!.slides.length > 0
          ? input.hero!.slides.map((s, i) => {
              const primaryCta = { ...base.hero.slides[0].primaryCta, ...s.primaryCta }
              const secondaryCta = { ...base.hero.slides[0].secondaryCta, ...s.secondaryCta }
              if (/demo/i.test(primaryCta.label)) primaryCta.label = 'Start for free'
              if (secondaryCta.href === '#pricing' || /pricing/i.test(secondaryCta.label)) {
                secondaryCta.label = "What's included"
                secondaryCta.action = 'hash'
                secondaryCta.href = '#for-churches'
              }
              return {
                ...base.hero.slides[Math.min(i, base.hero.slides.length - 1)],
                ...s,
                id: s.id || `slide-${i + 1}`,
                primaryCta,
                secondaryCta,
              }
            })
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
    pricing,
    closingCta: {
      ...base.closingCta,
      ...input.closingCta,
      buttonLabel: /demo|open churchos/i.test(input.closingCta?.buttonLabel || '')
        ? base.closingCta.buttonLabel
        : input.closingCta?.buttonLabel || base.closingCta.buttonLabel,
    },
    footer: {
      ...base.footer,
      ...input.footer,
      links: (Array.isArray(input.footer?.links) ? input.footer!.links : base.footer.links).map((link) =>
        /pricing/i.test(link.label) || link.href === '#pricing'
          ? { label: 'For churches', href: '#for-churches' }
          : link,
      ),
    },
  }
}
