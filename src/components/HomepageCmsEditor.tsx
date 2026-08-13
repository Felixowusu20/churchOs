'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, Trash2, ImagePlus } from 'lucide-react'
import { api, ApiError, uploadImage } from '../lib/api'
import {
  defaultHomepageContent,
  normalizeHomepageContent,
  HOMEPAGE_FEATURE_ICONS,
  type HomepageContent,
  type HeroSlide,
} from '../lib/homepage'
import { notifyHomepageUpdated } from '../hooks/useHomepage'
import SiteBrand from './SiteBrand'

type ToastFn = (type: 'success' | 'error', message: string) => void

function newSlide(): HeroSlide {
  const id = `slide-${Date.now().toString(36)}`
  return {
    id,
    brand: 'ChurchOS',
    headline: 'New hero headline',
    subcopy: 'Supporting line for this slide.',
    primaryCta: { label: 'Get started', action: 'login' },
    secondaryCta: { label: 'Learn more', action: 'hash', href: '#features' },
    imageUrl: '',
    gradient:
      'linear-gradient(160deg, #141C2B 0%, #1F2D4D 55%, #243554 100%)',
  }
}

export default function HomepageCmsEditor({ showToast }: { showToast: ToastFn }) {
  const [content, setContent] = useState<HomepageContent>(defaultHomepageContent)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef(content)
  contentRef.current = content

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ content: HomepageContent }>(`/api/site/homepage?t=${Date.now()}`)
      setContent(normalizeHomepageContent(data.content))
      setDirty(false)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not load homepage CMS')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void load()
  }, [load])

  const patch = (next: HomepageContent) => {
    setContent(next)
    setDirty(true)
  }

  const save = async (override?: HomepageContent) => {
    const payload = override ?? contentRef.current
    setSaving(true)
    try {
      const data = await api<{ content: HomepageContent }>('/api/site/homepage', {
        method: 'PUT',
        json: { content: payload },
      })
      setContent(normalizeHomepageContent(data.content))
      setDirty(false)
      notifyHomepageUpdated()
      showToast('success', 'Homepage updated — public site will show these changes')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not save homepage')
    } finally {
      setSaving(false)
    }
  }

  const slide = content.hero.slides[slideIndex] || content.hero.slides[0]

  const updateSlide = (partial: Partial<HeroSlide>) => {
    const slides = content.hero.slides.map((s, i) => (i === slideIndex ? { ...s, ...partial } : s))
    patch({ ...content, hero: { ...content.hero, slides } })
  }

  const uploadSlideImage = async (file: File) => {
    setUploading(true)
    try {
      const up = await uploadImage(file, 'homepage')
      updateSlide({ imageUrl: up.url })
      showToast('success', 'Slide image uploaded')
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadLogo = async (file: File) => {
    setUploading(true)
    try {
      const up = await uploadImage(file, 'homepage')
      const next = { ...contentRef.current, logoUrl: up.url }
      setContent(next)
      setDirty(true)
      await save(next)
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Logo upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="panel rounded-lg p-12 flex items-center justify-center gap-2 text-sm text-[#8A91A0]">
        <Loader2 size={16} className="animate-spin" /> Loading homepage CMS…
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">Homepage CMS</h3>
          <p className="text-xs text-[#8A91A0] mt-0.5">
            Edit the public landing page — logo, hero, features, and free-for-churches copy
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void load()}
            className="px-4 py-2 text-xs border border-[#E4E0DA] rounded-md text-[#5C6578] disabled:opacity-40"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="btn-primary px-5 py-2 text-xs font-medium rounded-md inline-flex items-center gap-2 disabled:opacity-40"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save homepage
          </button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-md bg-[#F5F0E8] border border-[#E8DFD0] px-3 py-2 text-xs text-[#85693F]">
          Unsaved changes
        </div>
      )}

      <div className="panel rounded-lg p-5 space-y-5">
        <h4 className="text-sm font-medium text-ink">Logo & brand</h4>

        <div className="grid sm:grid-cols-2 gap-3 rounded-xl overflow-hidden border border-[#E4E0DA]">
          <div className="bg-[#F7F5F2] px-6 py-10 flex items-center justify-center min-h-[220px]">
            <SiteBrand content={content} variant="on-light" size="preview" />
          </div>
          <div className="bg-primary px-6 py-10 flex items-center justify-center min-h-[220px]">
            <SiteBrand content={content} variant="on-dark" size="preview" />
          </div>
        </div>
        <p className="text-[11px] text-[#8A91A0] -mt-2">
          Live preview · light header and dark hero. Logo sits above the brand + accent.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-[#E4E0DA] rounded-md px-3 py-2 hover:bg-[#F8F6F3] cursor-pointer">
            <ImagePlus size={13} />
            {uploading ? 'Uploading…' : content.logoUrl ? 'Change logo' : 'Upload logo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadLogo(file)
                e.target.value = ''
              }}
            />
          </label>
          {content.logoUrl ? (
            <button
              type="button"
              onClick={() => patch({ ...content, logoUrl: '' })}
              className="text-xs font-medium text-[#8A91A0] hover:text-danger px-2 py-1.5"
            >
              Remove logo
            </button>
          ) : null}
        </div>
        <input
          value={content.logoUrl}
          onChange={(e) => patch({ ...content, logoUrl: e.target.value })}
          placeholder="Or paste a logo image URL"
          className="input-field w-full px-3 py-2 rounded-md text-sm"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#8A91A0] mb-1">Brand</label>
            <input
              value={content.brand}
              onChange={(e) => patch({ ...content, brand: e.target.value })}
              className="input-field w-full px-3 py-2 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8A91A0] mb-1">Accent</label>
            <input
              value={content.brandAccent}
              onChange={(e) => patch({ ...content, brandAccent: e.target.value })}
              className="input-field w-full px-3 py-2 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8A91A0] mb-1">Sign in label</label>
            <input
              value={content.navSignInLabel}
              onChange={(e) => patch({ ...content, navSignInLabel: e.target.value })}
              className="input-field w-full px-3 py-2 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8A91A0] mb-1">Check-in label</label>
            <input
              value={content.navCheckInLabel}
              onChange={(e) => patch({ ...content, navCheckInLabel: e.target.value })}
              className="input-field w-full px-3 py-2 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      <div className="panel rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-ink">Hero carousel</h4>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#8A91A0]">Autoplay ms</label>
            <input
              type="number"
              min={0}
              step={500}
              value={content.hero.autoplayMs}
              onChange={(e) =>
                patch({
                  ...content,
                  hero: { ...content.hero, autoplayMs: Number(e.target.value) || 0 },
                })
              }
              className="input-field w-24 px-2 py-1.5 rounded-md text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const slides = [...content.hero.slides, newSlide()]
                patch({ ...content, hero: { ...content.hero, slides } })
                setSlideIndex(slides.length - 1)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-[#E4E0DA] rounded-md"
            >
              <Plus size={12} /> Slide
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {content.hero.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlideIndex(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                i === slideIndex
                  ? 'bg-primary text-white border-primary'
                  : 'border-[#E4E0DA] text-[#5C6578] hover:bg-[#F8F6F3]'
              }`}
            >
              Slide {i + 1}
            </button>
          ))}
        </div>

        {slide && (
          <div className="space-y-3 border-t border-[#E4E0DA] pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8A91A0] mb-1">Brand on slide</label>
                <input
                  value={slide.brand}
                  onChange={(e) => updateSlide({ brand: e.target.value })}
                  className="input-field w-full px-3 py-2 rounded-md text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8A91A0] mb-1">Headline</label>
                <input
                  value={slide.headline}
                  onChange={(e) => updateSlide({ headline: e.target.value })}
                  className="input-field w-full px-3 py-2 rounded-md text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8A91A0] mb-1">Supporting copy</label>
                <textarea
                  value={slide.subcopy}
                  onChange={(e) => updateSlide({ subcopy: e.target.value })}
                  rows={2}
                  className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8A91A0] mb-1">Primary CTA</label>
                <input
                  value={slide.primaryCta.label}
                  onChange={(e) =>
                    updateSlide({ primaryCta: { ...slide.primaryCta, label: e.target.value } })
                  }
                  className="input-field w-full px-3 py-2 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8A91A0] mb-1">Secondary CTA</label>
                <input
                  value={slide.secondaryCta.label}
                  onChange={(e) =>
                    updateSlide({ secondaryCta: { ...slide.secondaryCta, label: e.target.value } })
                  }
                  className="input-field w-full px-3 py-2 rounded-md text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8A91A0] mb-1">Image URL</label>
                <div className="flex gap-2">
                  <input
                    value={slide.imageUrl}
                    onChange={(e) => updateSlide({ imageUrl: e.target.value })}
                    placeholder="https://… or upload"
                    className="input-field flex-1 px-3 py-2 rounded-md text-sm"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E4E0DA] rounded-md text-xs cursor-pointer hover:bg-[#F8F6F3]">
                    <ImagePlus size={13} />
                    {uploading ? '…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadSlideImage(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {slide.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="mt-2 h-28 w-full object-cover rounded-md border border-[#E4E0DA]"
                  />
                )}
              </div>
            </div>
            {content.hero.slides.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const slides = content.hero.slides.filter((_, i) => i !== slideIndex)
                  patch({ ...content, hero: { ...content.hero, slides } })
                  setSlideIndex(Math.max(0, slideIndex - 1))
                }}
                className="inline-flex items-center gap-1.5 text-xs text-danger"
              >
                <Trash2 size={12} /> Remove this slide
              </button>
            )}
          </div>
        )}
      </div>

      <div className="panel rounded-lg p-5 space-y-4">
        <h4 className="text-sm font-medium text-ink">Features section</h4>
        <input
          value={content.features.title}
          onChange={(e) =>
            patch({ ...content, features: { ...content.features, title: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Section title"
        />
        <textarea
          value={content.features.subtitle}
          onChange={(e) =>
            patch({ ...content, features: { ...content.features, subtitle: e.target.value } })
          }
          rows={2}
          className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
        />
        <div className="space-y-3">
          {content.features.items.map((item, i) => (
            <div key={i} className="grid sm:grid-cols-[140px_1fr_1fr] gap-2 p-3 rounded-md bg-[#F8F6F3]">
              <select
                value={item.icon}
                onChange={(e) => {
                  const items = content.features.items.map((it, idx) =>
                    idx === i ? { ...it, icon: e.target.value } : it,
                  )
                  patch({ ...content, features: { ...content.features, items } })
                }}
                className="input-field px-2 py-2 rounded-md text-xs"
              >
                {HOMEPAGE_FEATURE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <input
                value={item.title}
                onChange={(e) => {
                  const items = content.features.items.map((it, idx) =>
                    idx === i ? { ...it, title: e.target.value } : it,
                  )
                  patch({ ...content, features: { ...content.features, items } })
                }}
                className="input-field px-2 py-2 rounded-md text-sm"
                placeholder="Title"
              />
              <input
                value={item.desc}
                onChange={(e) => {
                  const items = content.features.items.map((it, idx) =>
                    idx === i ? { ...it, desc: e.target.value } : it,
                  )
                  patch({ ...content, features: { ...content.features, items } })
                }}
                className="input-field px-2 py-2 rounded-md text-sm"
                placeholder="Description"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel rounded-lg p-5 space-y-4">
        <h4 className="text-sm font-medium text-ink">How it works</h4>
        <input
          value={content.howItWorks.title}
          onChange={(e) =>
            patch({ ...content, howItWorks: { ...content.howItWorks, title: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
        />
        <textarea
          value={content.howItWorks.subtitle}
          onChange={(e) =>
            patch({ ...content, howItWorks: { ...content.howItWorks, subtitle: e.target.value } })
          }
          rows={2}
          className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
        />
        {content.howItWorks.steps.map((step, i) => (
          <div key={i} className="grid sm:grid-cols-2 gap-2">
            <input
              value={step.title}
              onChange={(e) => {
                const steps = content.howItWorks.steps.map((s, idx) =>
                  idx === i ? { ...s, title: e.target.value } : s,
                )
                patch({ ...content, howItWorks: { ...content.howItWorks, steps } })
              }}
              className="input-field px-3 py-2 rounded-md text-sm"
              placeholder={`Step ${i + 1} title`}
            />
            <input
              value={step.desc}
              onChange={(e) => {
                const steps = content.howItWorks.steps.map((s, idx) =>
                  idx === i ? { ...s, desc: e.target.value } : s,
                )
                patch({ ...content, howItWorks: { ...content.howItWorks, steps } })
              }}
              className="input-field px-3 py-2 rounded-md text-sm"
              placeholder="Description"
            />
          </div>
        ))}
      </div>

      <div className="panel rounded-lg p-5 space-y-3">
        <h4 className="text-sm font-medium text-ink">Testimonial</h4>
        <textarea
          value={content.testimonial.quote}
          onChange={(e) =>
            patch({ ...content, testimonial: { ...content.testimonial, quote: e.target.value } })
          }
          rows={3}
          className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
        />
        <input
          value={content.testimonial.attribution}
          onChange={(e) =>
            patch({
              ...content,
              testimonial: { ...content.testimonial, attribution: e.target.value },
            })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Attribution"
        />
      </div>

      <div className="panel rounded-lg p-5 space-y-4">
        <h4 className="text-sm font-medium text-ink">Free for churches</h4>
        <p className="text-[11px] text-[#8A91A0] -mt-2">
          ChurchOS is free for congregations. This section appears on the public homepage — no price tags.
        </p>
        <input
          value={content.pricing.title}
          onChange={(e) =>
            patch({ ...content, pricing: { ...content.pricing, title: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Section title"
        />
        <textarea
          value={content.pricing.subtitle}
          onChange={(e) =>
            patch({ ...content, pricing: { ...content.pricing, subtitle: e.target.value } })
          }
          rows={2}
          className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
          placeholder="Free-for-churches message"
        />
        {(content.pricing.plans[0] ? [content.pricing.plans[0]] : []).map((plan, i) => (
          <div key={i} className="p-3 rounded-md bg-[#F8F6F3] space-y-2">
            <input
              value={plan.desc}
              onChange={(e) => {
                const plans = content.pricing.plans.map((p, idx) =>
                  idx === i ? { ...p, desc: e.target.value } : p,
                )
                patch({ ...content, pricing: { ...content.pricing, plans } })
              }}
              className="input-field w-full px-2 py-2 rounded-md text-sm"
              placeholder="Short description"
            />
            <input
              value={plan.cta}
              onChange={(e) => {
                const plans = content.pricing.plans.map((p, idx) =>
                  idx === i ? { ...p, cta: e.target.value } : p,
                )
                patch({ ...content, pricing: { ...content.pricing, plans } })
              }}
              className="input-field w-full px-2 py-2 rounded-md text-sm"
              placeholder="Button label (e.g. Start for free)"
            />
            <textarea
              value={plan.features.join('\n')}
              onChange={(e) => {
                const features = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)
                const plans = content.pricing.plans.map((p, idx) =>
                  idx === i ? { ...p, features } : p,
                )
                patch({ ...content, pricing: { ...content.pricing, plans } })
              }}
              rows={5}
              className="input-field w-full px-2 py-2 rounded-md text-sm resize-none"
              placeholder="One included tool per line"
            />
          </div>
        ))}
      </div>

      <div className="panel rounded-lg p-5 space-y-3">
        <h4 className="text-sm font-medium text-ink">Closing CTA & footer</h4>
        <input
          value={content.closingCta.title}
          onChange={(e) =>
            patch({ ...content, closingCta: { ...content.closingCta, title: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Closing title"
        />
        <textarea
          value={content.closingCta.body}
          onChange={(e) =>
            patch({ ...content, closingCta: { ...content.closingCta, body: e.target.value } })
          }
          rows={2}
          className="input-field w-full px-3 py-2 rounded-md text-sm resize-none"
        />
        <input
          value={content.closingCta.buttonLabel}
          onChange={(e) =>
            patch({
              ...content,
              closingCta: { ...content.closingCta, buttonLabel: e.target.value },
            })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Button label"
        />
        <input
          value={content.footer.tagline}
          onChange={(e) =>
            patch({ ...content, footer: { ...content.footer, tagline: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Footer tagline"
        />
        <input
          value={content.footer.copyright}
          onChange={(e) =>
            patch({ ...content, footer: { ...content.footer, copyright: e.target.value } })
          }
          className="input-field w-full px-3 py-2 rounded-md text-sm"
          placeholder="Copyright"
        />
      </div>
    </div>
  )
}
