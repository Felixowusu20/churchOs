'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOff, ShieldCheck } from 'lucide-react'

export type FaceScanMode = 'enroll' | 'checkin'

type Phase = 'starting' | 'preview' | 'scanning' | 'verifying' | 'success' | 'error'

type Props = {
  mode: FaceScanMode
  memberLabel?: string
  /** If true, never capture/overwrite a profile photo from the camera. */
  preserveAvatar?: boolean
  onAuthenticate: () => Promise<{ alreadyCheckedIn?: boolean } | void>
  onCancel: () => void
  /** Called after Face ID succeeds; awaited so DB save can finish before success UI. */
  onSuccess?: () => void | Promise<void>
  onFrameCapture?: (dataUrl: string) => void
}

async function openFrontCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not available in this browser.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 720 },
        height: { ideal: 720 },
      },
    })
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  }
}

export default function FaceScanCapture({
  mode,
  memberLabel,
  preserveAvatar = false,
  onAuthenticate,
  onCancel,
  onSuccess,
  onFrameCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const authRef = useRef(onAuthenticate)
  const successRef = useRef(onSuccess)
  const frameRef = useRef(onFrameCapture)
  const preserveRef = useRef(preserveAvatar)
  const mountedRef = useRef(true)
  const ranAuth = useRef(false)
  const capturedFrame = useRef(false)
  const [phase, setPhase] = useState<Phase>('starting')
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusLine, setStatusLine] = useState('INIT_SENSOR…')

  authRef.current = onAuthenticate
  successRef.current = onSuccess
  frameRef.current = onFrameCapture
  preserveRef.current = preserveAvatar

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const captureSnapshot = () => {
    if (preserveRef.current) return null
    const video = videoRef.current
    if (!video || video.videoWidth < 2) return null
    try {
      const canvas = document.createElement('canvas')
      const size = Math.min(video.videoWidth, video.videoHeight)
      canvas.width = 480
      canvas.height = 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      const sx = (video.videoWidth - size) / 2
      const sy = (video.videoHeight - size) / 2
      ctx.translate(480, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      capturedFrame.current = true
      frameRef.current?.(dataUrl)
      return dataUrl
    } catch {
      return null
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setStatusLine('OPENING_CAMERA…')
        const stream = await openFrontCamera()
        if (cancelled || !mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.setAttribute('playsinline', 'true')
          video.muted = true
          await video.play().catch(() => undefined)
        }
        if (!cancelled && mountedRef.current) {
          setCameraReady(true)
          setPhase('preview')
          setStatusLine('CAMERA_ONLINE · LOCK_TARGET')
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setCameraReady(false)
          setPhase('preview')
          setStatusLine('CAMERA_OFFLINE · FACE_ID_ONLY')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (phase !== 'preview') return
    const warm = window.setTimeout(() => {
      if (!mountedRef.current) return
      setPhase('scanning')
      setStatusLine('SCANNING_FACIAL_GRID…')
    }, 600)
    return () => clearTimeout(warm)
  }, [phase])

  useEffect(() => {
    if (phase !== 'scanning') return
    setProgress(0)
    const started = Date.now()
    const duration = 2000
    const tick = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / duration) * 100)
      setProgress(p)
      if (p >= 100) window.clearInterval(tick)
    }, 40)
    return () => window.clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (phase !== 'scanning' || !cameraReady || capturedFrame.current || preserveAvatar) return
    const timer = window.setTimeout(() => captureSnapshot(), 800)
    return () => clearTimeout(timer)
  }, [phase, cameraReady, preserveAvatar])

  // Run Face ID once — do NOT cancel when moving scanning → verifying
  useEffect(() => {
    if (phase !== 'scanning' || ranAuth.current) return
    ranAuth.current = true

    void (async () => {
      await new Promise((r) => setTimeout(r, 1500))
      if (!mountedRef.current) return

      setPhase('verifying')
      setStatusLine('AWAITING_FACE_ID_PROMPT…')
      setProgress(92)

      try {
        const result = await authRef.current()
        if (!mountedRef.current) return

        if (!preserveRef.current) captureSnapshot()
        setAlreadyCheckedIn(Boolean(result?.alreadyCheckedIn))
        setStatusLine(mode === 'enroll' ? 'WRITING_CREDENTIALS…' : 'VERIFYING_ATTENDANCE…')
        setProgress(100)

        stopCamera()
        setCameraReady(false)
        setPhase('success')

        await successRef.current?.()
        if (!mountedRef.current) return
        setStatusLine(mode === 'enroll' ? 'MEMBER_ADDED_OK' : 'CHECKIN_OK')
      } catch (err) {
        if (!mountedRef.current) return
        stopCamera()
        setCameraReady(false)
        setPhase('error')
        setStatusLine('AUTH_FAILED')
        setError(err instanceof Error ? err.message : 'Face ID failed')
      }
    })()
  }, [phase, mode])

  const restart = () => {
    ranAuth.current = false
    capturedFrame.current = false
    setError('')
    setProgress(0)
    setPhase('starting')
    setStatusLine('REBOOT_SENSOR…')
    void (async () => {
      try {
        stopCamera()
        const stream = await openFrontCamera()
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.muted = true
          await videoRef.current.play().catch(() => undefined)
          setCameraReady(true)
        }
      } catch {
        setCameraReady(false)
      }
      if (mountedRef.current) setPhase('preview')
    })()
  }

  const title =
    phase === 'success'
      ? mode === 'enroll'
        ? 'Member successfully added'
        : alreadyCheckedIn
          ? 'Already checked in'
          : 'Checked in'
      : phase === 'verifying'
        ? 'Face ID prompt…'
        : phase === 'scanning'
          ? 'Scanning target'
          : phase === 'error'
            ? 'Scan failed'
            : 'Acquire target'

  const subtitle =
    phase === 'success'
      ? mode === 'enroll'
        ? `${memberLabel || 'Member'} is saved with Face ID credentials`
        : alreadyCheckedIn
          ? 'Already on the attendance list — count unchanged'
          : 'You’re on the attendance list'
      : phase === 'verifying'
        ? 'Approve Face ID in Safari — scanner will stop after success'
        : phase === 'scanning'
          ? 'Hold still inside the green grid'
          : phase === 'error'
            ? error
            : mode === 'enroll'
              ? `Enrolling ${memberLabel || 'member'} via secure Face ID`
              : 'Verify identity for check-in'

  const accent =
    phase === 'success' ? '#3DFF9A' : phase === 'error' ? '#FF5C5C' : '#3DFF9A'

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto text-center">
      <div className="relative mx-auto mb-5 w-[min(82vw,300px)] aspect-square">
        <div
          className="absolute inset-[-10%] rounded-full opacity-40 blur-2xl"
          style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
        />

        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(61,255,154,0.15)" strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * 289} 289`}
            className="transition-[stroke-dasharray] duration-100 ease-linear drop-shadow-[0_0_6px_rgba(61,255,154,0.8)]"
          />
        </svg>

        <div className="absolute inset-[7%] rounded-full overflow-hidden bg-[#04140c] border-2 border-[#3DFF9A]/70 shadow-[0_0_32px_rgba(61,255,154,0.25)]">
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover scale-x-[-1] transition-opacity duration-500 ${
              cameraReady && phase !== 'success' ? 'opacity-90' : 'opacity-0'
            }`}
            playsInline
            muted
            autoPlay
          />

          {/* Green matrix overlay */}
          {(phase === 'preview' || phase === 'scanning' || phase === 'verifying') && cameraReady && (
            <div className="pointer-events-none absolute inset-0 face-hack-overlay" />
          )}

          {!cameraReady && phase !== 'error' && phase !== 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#04140c] text-[#3DFF9A]/80 px-6 font-mono">
              <CameraOff size={26} strokeWidth={1.4} />
              <p className="text-[10px] tracking-wider uppercase leading-relaxed">
                {phase === 'starting' ? 'Booting camera…' : 'Camera offline — Face ID still runs'}
              </p>
            </div>
          )}

          {(phase === 'preview' || phase === 'scanning' || phase === 'verifying') && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[58%] h-[72%] rounded-[50%] border border-[#3DFF9A]/45 shadow-[inset_0_0_40px_rgba(61,255,154,0.12)]" />
            </div>
          )}

          {(phase === 'scanning' || phase === 'verifying') && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="face-hack-beam absolute left-0 right-0 h-[22%]" />
              <div className="absolute inset-x-[10%] top-[16%] bottom-[16%] border-x border-[#3DFF9A]/35" />
              <div className="absolute inset-y-[12%] left-[14%] right-[14%] border-y border-[#3DFF9A]/25" />
              <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#3DFF9A]" />
              <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#3DFF9A]" />
              <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#3DFF9A]" />
              <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#3DFF9A]" />
              <div className="absolute bottom-3 inset-x-0 text-center font-mono text-[9px] tracking-[0.2em] text-[#3DFF9A]/90">
                {Math.round(progress)}% · BIOMETRIC_LOCK
              </div>
            </div>
          )}

          {phase === 'success' && (
            <div className="absolute inset-0 bg-[#04140c]/92 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full border border-[#3DFF9A] bg-[#3DFF9A]/15 flex items-center justify-center shadow-[0_0_24px_rgba(61,255,154,0.45)]">
                <ShieldCheck size={28} className="text-[#3DFF9A]" strokeWidth={2} />
              </div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#3DFF9A]">ACCESS_GRANTED</p>
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[0.16em] text-[#2F6B4F] mb-2 uppercase">
        {statusLine}
      </p>
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">{title}</h2>
      <p className="text-sm text-[#5C6578] leading-relaxed px-3 min-h-[2.75rem]">{subtitle}</p>

      {(phase === 'error' || phase === 'preview' || phase === 'starting') && (
        <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          {phase === 'error' && (
            <button
              type="button"
              onClick={restart}
              className="w-full py-3.5 rounded-xl text-sm font-medium touch-manipulation bg-[#04140c] text-[#3DFF9A] border border-[#3DFF9A]/50"
            >
              Retry scan
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              stopCamera()
              onCancel()
            }}
            className="w-full py-3 rounded-xl text-sm font-medium text-[#5C6578]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
