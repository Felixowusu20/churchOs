/** Lightweight localStorage helpers for the offline prototype. */

export function loadStore<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveStore<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private mode — prototype still works in-memory
  }
}

export const STORE_KEYS = {
  org: 'churchos.org.v1',
  checkIn: 'churchos.checkin.v1',
} as const
