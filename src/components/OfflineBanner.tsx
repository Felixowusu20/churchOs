import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-[90] flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-xs font-medium text-white"
    >
      <WifiOff size={13} className="shrink-0 text-accent-soft" />
      Offline mode — members, check-ins, and settings save on this device
    </div>
  )
}
