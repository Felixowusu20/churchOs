import type { HomepageContent } from '../lib/homepage'

type Variant = 'on-light' | 'on-dark' | 'on-hero'

function logoSrc(url: string) {
  if (!url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(url)}`
}

export default function SiteBrand({
  content,
  variant = 'on-light',
  className = '',
  imageClassName = '',
}: {
  content: HomepageContent
  variant?: Variant
  className?: string
  imageClassName?: string
}) {
  const alt = `${content.brand}${content.brandAccent}`.trim() || 'Logo'
  const logoUrl = content.logoUrl?.trim()

  if (logoUrl) {
    const shadow = variant === 'on-hero' ? 'drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)]' : ''
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={logoUrl}
        src={logoSrc(logoUrl)}
        alt={alt}
        className={`h-8 sm:h-9 w-auto max-h-10 max-w-[180px] object-contain ${shadow} ${imageClassName}`}
      />
    )
  }

  const textColor =
    variant === 'on-light' ? 'text-ink' : 'text-white'
  const accentColor =
    variant === 'on-light' ? 'text-accent' : 'text-accent-soft'

  return (
    <span className={`font-display font-semibold tracking-tight ${textColor} ${className}`}>
      {content.brand}
      <span className={accentColor}>{content.brandAccent}</span>
    </span>
  )
}
