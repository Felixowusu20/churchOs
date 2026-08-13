'use client'

import { useCallback, useEffect, useState } from 'react'
import { defaultHomepageContent, normalizeHomepageContent, type HomepageContent } from '../lib/homepage'

export const HOMEPAGE_UPDATED_EVENT = 'churchos:homepage-updated'

export function useHomepage() {
  const [content, setContent] = useState<HomepageContent>(defaultHomepageContent)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/site/homepage?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (data?.content) setContent(normalizeHomepageContent(data.content))
    } catch {
      /* keep current */
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onUpdate = () => void refresh()
    window.addEventListener(HOMEPAGE_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(HOMEPAGE_UPDATED_EVENT, onUpdate)
  }, [refresh])

  return { content, loaded, refresh }
}

export function notifyHomepageUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(HOMEPAGE_UPDATED_EVENT))
}
