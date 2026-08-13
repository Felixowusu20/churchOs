'use client'

import { AlertTriangle, X } from 'lucide-react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-[#E4E0DA] shadow-xl animate-fade-in overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                danger ? 'bg-[#F8EDE9] text-danger' : 'bg-[#F5F0E8] text-accent'
              }`}
            >
              <AlertTriangle size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 id="confirm-title" className="font-display text-xl font-semibold text-ink leading-snug">
                  {title}
                </h3>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCancel}
                  className="text-[#A8AEB8] hover:text-ink p-1 -mt-1 -mr-1 disabled:opacity-40"
                >
                  <X size={16} />
                </button>
              </div>
              <p id="confirm-message" className="text-sm text-[#5C6578] mt-2 leading-relaxed">
                {message}
              </p>
              {detail && (
                <p className="mt-3 text-xs text-[#8A91A0] bg-[#F8F6F3] border border-[#E8E0D4] rounded-md px-3 py-2.5 leading-relaxed">
                  {detail}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 bg-[#F8F6F3] border-t border-[#E4E0DA] flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-md border border-[#E4E0DA] bg-white text-sm text-[#5C6578] hover:bg-white disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-50 ${
              danger ? 'bg-danger hover:opacity-90' : 'btn-primary'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
