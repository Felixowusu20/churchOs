const TOKEN_KEY = 'churchos.admin.token'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let body = options.body
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.json)
  }

  const res = await fetch(path, { ...options, headers, body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error || 'Request failed')
  }
  return data as T
}

export async function uploadImage(file: File, folder = 'receipts') {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch('/api/uploads', { method: 'POST', headers, body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error || 'Upload failed')
  }
  return data as { url: string; publicId: string }
}
