'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Fingerprint, Users, DollarSign, Calendar, BarChart3,
  GitBranch, Check, Menu, X, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  type HomepageCta,
  type HeroSlide,
} from '../lib/homepage'
import { useHomepage } from '../hooks/useHomepage'
import SiteBrand from '../components/SiteBrand'

interface LandingProps {
  onNavigate: (page: string) => void
  /** When false, Member check-in still goes through sign-in first. */
  isSignedIn?: boolean
}

const iconMap = {
  Fingerprint,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  GitBranch,
} as const

function resolveCta(cta: HomepageCta, onNavigate: (page: string) => void) {
  if (cta.action === 'login') onNavigate('login')
  else if (cta.action === 'check-in') onNavigate('check-in')
  else if (cta.action === 'external' && cta.href) window.open(cta.href, '_blank', 'noopener,noreferrer')
  else if (cta.action === 'hash' && cta.href) {
    document.querySelector(cta.href)?.scrollIntoView({ behavior: 'smooth' })
  }
}

function HeroCarousel({
  slides,
  autoplayMs,
  logoUrl,
  onNavigate,
}: {
  slides: HeroSlide[]
  autoplayMs: number
  logoUrl?: string
  onNavigate: (page: string) => void
}) {
  const [index, setIndex] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const count = slides.length || 1
  const slide = slides[index] || slides[0]

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count)
      setAnimKey((k) => k + 1)
    },
    [count],
  )

  useEffect(() => {
    if (count <= 1 || autoplayMs <= 0) return
    const t = window.setInterval(() => go(index + 1), autoplayMs)
    return () => window.clearInterval(t)
  }, [autoplayMs, count, go, index])

  if (!slide) return null

  return (
    <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={i !== index}
        >
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.imageUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover ${i === index ? 'animate-ken-burns' : ''}`}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: s.gradient || '#1F2D4D' }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, rgba(20,28,43,0.92) 0%, rgba(20,28,43,0.55) 48%, rgba(20,28,43,0.25) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1520] via-transparent to-[#0F1520]/30" />
          <div className="absolute inset-0 landing-grain opacity-40 mix-blend-overlay" />
        </div>
      ))}

      <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-8 pb-16 sm:pb-24 pt-28 sm:pt-36">
        <div key={animKey} className="animate-fade-in-slow">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={logoUrl}
              src={logoUrl}
              alt=""
              className="h-16 sm:h-20 lg:h-24 w-auto max-w-[min(100%,320px)] object-contain mb-6 drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <p className="font-display text-[3.4rem] sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight mb-4 sm:mb-5 leading-[0.95]">
              {slide.brand}
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-3xl lg:text-[2.35rem] text-white/92 font-medium max-w-xl leading-[1.25] mb-4">
            {slide.headline}
          </h1>
          <p className="text-white/68 text-base sm:text-lg max-w-md mb-9 leading-relaxed">
            {slide.subcopy}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => resolveCta(slide.primaryCta, onNavigate)}
              className="btn-accent px-7 py-3.5 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2"
            >
              {slide.primaryCta.label}
              <ArrowRight size={16} />
            </button>
            {slide.secondaryCta?.label && (
              <button
                type="button"
                onClick={() => resolveCta(slide.secondaryCta, onNavigate)}
                className="px-7 py-3.5 text-sm font-medium rounded-md text-white border border-white/25 hover:bg-white/10 hover:border-white/40 transition-all text-center backdrop-blur-[2px]"
              >
                {slide.secondaryCta.label}
              </button>
            )}
          </div>
        </div>

        {count > 1 && (
          <div className="mt-12 flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="w-10 h-10 rounded-md border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/35 inline-flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2 items-center">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    setIndex(i)
                    setAnimKey((k) => k + 1)
                  }}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === index ? 'w-10 bg-accent-soft' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="w-10 h-10 rounded-md border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/35 inline-flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <div className="hidden sm:block ml-2 flex-1 max-w-[120px] h-px bg-white/15 overflow-hidden">
              <div
                key={`progress-${animKey}`}
                className="h-full bg-accent-soft/80 origin-left"
                style={{
                  animation: autoplayMs > 0 ? `slide-progress ${autoplayMs}ms linear` : undefined,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Landing({ onNavigate, isSignedIn = false }: LandingProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { content, loaded } = useHomepage()
  const [scrolled, setScrolled] = useState(false)

  const openCheckIn = () => onNavigate('check-in')
  const openSignIn = () => onNavigate('login')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`min-h-screen bg-[#F7F5F2] font-sans text-ink transition-opacity duration-500 ${
        loaded ? 'opacity-100' : 'opacity-90'
      }`}
    >
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileOpen
            ? 'bg-[#F7F5F2]/92 backdrop-blur-md border-b border-[#E4E0DA] shadow-[0_1px_0_rgba(20,28,43,0.03)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[4.25rem] flex items-center justify-between">
          <span
            className={`font-display text-2xl font-semibold tracking-tight transition-colors ${
              scrolled || mobileOpen ? 'text-ink' : 'text-white'
            }`}
          >
            <SiteBrand
              content={content}
              variant={scrolled || mobileOpen ? 'on-light' : 'on-hero'}
              className="text-2xl"
            />
          </span>
          <div className="hidden md:flex items-center gap-8">
            {content.navLinks.map((item) => (
              <a
                key={item.href + item.label}
                href={item.href}
                className={`text-sm transition-colors ${
                  scrolled
                    ? 'text-[#5C6578] hover:text-ink'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2.5">
            <button
              type="button"
              onClick={openSignIn}
              className={`px-4 py-2 text-sm transition-colors ${
                scrolled ? 'text-[#5C6578] hover:text-ink' : 'text-white/75 hover:text-white'
              }`}
            >
              {content.navSignInLabel}
            </button>
            <button
              type="button"
              onClick={openCheckIn}
              title={isSignedIn ? 'Open fingerprint check-in' : 'Sign in required for check-in'}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                scrolled
                  ? 'text-primary border border-[#E4E0DA] hover:bg-white'
                  : 'text-white border border-white/25 hover:bg-white/10'
              }`}
            >
              {content.navCheckInLabel}
            </button>
            <button
              type="button"
              onClick={openSignIn}
              className="btn-primary px-5 py-2 text-sm font-medium rounded-md"
            >
              {content.navDemoLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 transition-colors ${
              scrolled || mobileOpen ? 'text-[#5C6578]' : 'text-white/80'
            }`}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E4E0DA] px-5 py-4 space-y-1 bg-[#F7F5F2]">
            {content.navLinks.map((item) => (
              <a
                key={item.href + item.label}
                href={item.href}
                className="block py-2.5 text-sm text-[#3D4555]"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                openCheckIn()
              }}
              className="w-full mt-3 py-2.5 text-sm font-medium rounded-md border border-[#E4E0DA] text-primary"
            >
              {content.navCheckInLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                openSignIn()
              }}
              className="w-full btn-primary mt-2 py-2.5 text-sm font-medium rounded-md"
            >
              {content.navSignInLabel}
            </button>
          </div>
        )}
      </nav>

      <HeroCarousel
        slides={content.hero.slides}
        autoplayMs={content.hero.autoplayMs}
        logoUrl={content.logoUrl}
        onNavigate={onNavigate}
      />

      <section id="features" className="py-20 sm:py-28 relative">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-xl mb-16">
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase mb-3">Capabilities</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink mb-4 leading-tight">
              {content.features.title}
            </h2>
            <p className="text-[#5C6578] leading-relaxed text-[15px]">{content.features.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {content.features.items.map((f, i) => {
              const Icon = iconMap[f.icon as keyof typeof iconMap] || Users
              return (
                <div key={`${f.title}-${i}`} className="group">
                  <div className="w-11 h-11 rounded-md bg-primary/[0.06] text-accent flex items-center justify-center mb-5 group-hover:bg-primary/[0.1] transition-colors">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-ink text-[15px] mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-[#5C6578] text-sm leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="section-rule max-w-6xl mx-auto" />

      <section id="how-it-works" className="py-20 sm:py-28 bg-white/70">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-xl mb-16">
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase mb-3">Workflow</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink mb-4 leading-tight">
              {content.howItWorks.title}
            </h2>
            <p className="text-[#5C6578] leading-relaxed text-[15px]">{content.howItWorks.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {content.howItWorks.steps.map((step, i) => (
              <div key={`${step.title}-${i}`} className="relative lg:pr-4">
                {i < content.howItWorks.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[3.25rem] right-0 h-px bg-gradient-to-r from-[#E4E0DA] to-transparent" />
                )}
                <span className="font-display text-5xl text-accent/35 font-semibold leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h4 className="font-semibold text-ink mt-4 mb-2 text-[15px]">{step.title}</h4>
                <p className="text-[#5C6578] text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(154,123,79,0.12), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(31,45,77,0.06), transparent 40%)',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <div className="w-10 h-px bg-accent mx-auto mb-8" />
          <blockquote className="font-display text-2xl sm:text-3xl lg:text-[2.15rem] text-ink font-medium leading-snug mb-8">
            “{content.testimonial.quote.replace(/^["“]|["”]$/g, '')}”
          </blockquote>
          <p className="text-sm text-[#5C6578] tracking-wide">{content.testimonial.attribution}</p>
        </div>
      </section>

      <section id="pricing" className="py-22 sm:py-28 bg-white/70 border-y border-[#E4E0DA]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-xl mb-14">
            <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase mb-3">Plans</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink mb-3 leading-tight">
              {content.pricing.title}
            </h2>
            <p className="text-[#5C6578] text-[15px]">{content.pricing.subtitle}</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-5 items-stretch">
            {content.pricing.plans.map((plan, i) => (
              <div
                key={`${plan.name}-${i}`}
                className={`relative p-8 rounded-lg flex flex-col transition-transform duration-300 hover:-translate-y-0.5 ${
                  plan.highlight
                    ? 'bg-primary text-white shadow-[0_24px_48px_-28px_rgba(31,45,77,0.65)] lg:scale-[1.02]'
                    : 'bg-[#F7F5F2] border border-[#E4E0DA]'
                }`}
              >
                <p className={`text-sm font-medium mb-1 ${plan.highlight ? 'text-accent-soft' : 'text-[#5C6578]'}`}>
                  {plan.name}
                  {plan.highlight ? ' · Recommended' : ''}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className={`font-display text-4xl font-semibold ${plan.highlight ? 'text-white' : 'text-ink'}`}
                  >
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-[#8A91A0]'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mb-7 ${plan.highlight ? 'text-white/70' : 'text-[#5C6578]'}`}>{plan.desc}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className={`w-full py-2.5 rounded-md text-sm font-medium mb-7 transition-colors ${
                    plan.highlight ? 'bg-accent text-white hover:bg-accent-soft' : 'btn-primary'
                  }`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3 mt-auto">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-accent-soft' : 'text-accent'}`}
                      />
                      <span className={`text-sm ${plan.highlight ? 'text-white/85' : 'text-[#3D4555]'}`}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-lg px-8 py-14 sm:px-14 bg-primary">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  'radial-gradient(ellipse at 15% 20%, rgba(154,123,79,0.35), transparent 45%), radial-gradient(ellipse at 90% 80%, rgba(42,61,104,0.8), transparent 40%)',
              }}
            />
            <div className="relative sm:flex sm:items-center sm:justify-between gap-8 text-center sm:text-left">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-3 leading-tight">
                  {content.closingCta.title}
                </h2>
                <p className="text-white/65 text-sm sm:text-base max-w-md leading-relaxed">
                  {content.closingCta.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="btn-accent mt-7 sm:mt-0 shrink-0 px-7 py-3.5 text-sm font-medium rounded-md inline-flex items-center gap-2"
              >
                {content.closingCta.buttonLabel}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E4E0DA] py-12 bg-white/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row justify-between gap-8">
          <div>
            <p className="font-display text-xl font-semibold text-ink mb-1.5">
              <SiteBrand content={content} variant="on-light" className="text-xl" />
            </p>
            <p className="text-sm text-[#8A91A0] max-w-xs">{content.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#5C6578]">
            {content.footer.links.map((link) => (
              <a key={link.label + link.href} href={link.href} className="hover:text-ink transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-[#8A91A0] sm:self-end">{content.footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}
