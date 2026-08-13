import type { HomepageContent } from '../lib/homepage'

type Variant = 'on-light' | 'on-dark' | 'on-hero'
type Size = 'nav' | 'hero' | 'preview' | 'mark'

function logoSrc(url: string) {
  if (!url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(url)}`
}

function Wordmark({
  content,
  variant,
  className = '',
}: {
  content: HomepageContent
  variant: Variant
  className?: string
}) {
  const textColor = variant === 'on-light' ? 'text-ink' : 'text-white'
  const accentColor = variant === 'on-light' ? 'text-accent' : 'text-accent-soft'

  return (
    <span className={`font-display font-bold tracking-tight leading-none ${textColor} ${className}`}>
      {content.brand}
      <span className={accentColor}>{content.brandAccent}</span>
    </span>
  )
}

export default function SiteBrand({
  content,
  variant = 'on-light',
  size = 'nav',
  className = '',
  imageClassName = '',
}: {
  content: HomepageContent
  variant?: Variant
  size?: Size
  className?: string
  imageClassName?: string
}) {
  const alt = `${content.brand}${content.brandAccent}`.trim() || 'Logo'
  const logoUrl = content.logoUrl?.trim()
  const shadow = variant === 'on-hero' ? 'drop-shadow-[0_2px_18px_rgba(0,0,0,0.4)]' : ''

  const Logo = ({ imgClass }: { imgClass: string }) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={logoUrl}
        src={logoSrc(logoUrl)}
        alt={alt}
        className={`object-cover ${shadow} ${imgClass} ${imageClassName}`}
      />
    ) : null

  if (size === 'mark') {
    const initials = `${content.brand?.[0] || ''}${content.brandAccent?.[0] || ''}`.toUpperCase() || 'C'
    return (
      <span
        className={`inline-flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full overflow-hidden ring-1 ring-white/15 bg-white/10 ${className}`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={logoUrl}
            src={logoSrc(logoUrl)}
            alt={alt}
            className={`h-full w-full object-cover ${imageClassName}`}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-sm font-semibold text-accent-soft">
            {initials}
          </span>
        )}
      </span>
    )
  }

  if (size === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center gap-2.5 ${className}`}>
        <Logo imgClass="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover" />
        <Wordmark content={content} variant={variant} className="text-sm sm:text-base font-bold tracking-[0.06em]" />
      </div>
    )
  }

  if (size === 'preview') {
    return (
      <div className={`flex flex-col items-center text-center gap-2.5 ${className}`}>
        <Logo imgClass="h-32 w-32 sm:h-36 sm:w-36 rounded-full object-cover" />
        <Wordmark content={content} variant={variant} className="text-sm sm:text-base font-bold tracking-[0.06em]" />
      </div>
    )
  }

  return (
    <span className={`inline-flex flex-col items-center gap-1 min-w-0 ${className}`}>
      <Logo imgClass="h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem] rounded-full object-cover shrink-0" />
      <Wordmark
        content={content}
        variant={variant}
        className="text-xs sm:text-sm font-bold tracking-[0.04em]"
      />
    </span>
  )
}
