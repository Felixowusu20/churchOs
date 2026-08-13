/** Local SVG avatars — no network needed. */

const palette = [
  { bg: '#1F2D4D', fg: '#C4A574' },
  { bg: '#2F6B4F', fg: '#E8F2EC' },
  { bg: '#9A7B4F', fg: '#F5F0E8' },
  { bg: '#5B4B8A', fg: '#F3F0F8' },
  { bg: '#8B5A6B', fg: '#F8F0F3' },
  { bg: '#2A3D68', fg: '#E8E4DC' },
]

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function localAvatar(name: string, size = 160) {
  const { bg, fg } = palette[hash(name) % palette.length]
  const label = initials(name)
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="Georgia, 'Times New Roman', serif" font-size="${Math.round(size * 0.34)}"
    font-weight="600" fill="${fg}">${label}</text>
</svg>`.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function localCover(title: string, tone = '#1F2D4D') {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tone}"/>
      <stop offset="100%" stop-color="#141C2B"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#g)"/>
  <circle cx="640" cy="80" r="120" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="120" cy="340" r="160" fill="#C4A574" fill-opacity="0.12"/>
  <text x="48" y="340" font-family="Georgia, serif" font-size="36" font-weight="600"
    fill="#F5F0E8" fill-opacity="0.9">${title.replace(/[<>&]/g, '')}</text>
</svg>`.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
