/** Phone / laptop biometrics via WebAuthn (Touch ID, Face ID, Android fingerprint). */

export function isWebAuthnAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function'
  )
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnAvailable()) return false
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    }
  } catch {
    /* ignore */
  }
  return true
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(value: string) {
  const pad = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

function randomChallenge() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytes.buffer
}

function rpId() {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname
}

export type EnrollResult = {
  credentialId: string
}

/** Prompt phone fingerprint / Face ID and return a credential id to store on the member. */
export async function enrollFingerprint(memberLabel: string): Promise<EnrollResult> {
  if (!isWebAuthnAvailable()) {
    throw new Error('Open ChurchOS in Safari on your iPhone to use Face ID / Touch ID.')
  }

  const userId = crypto.getRandomValues(new Uint8Array(16))
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: {
        name: 'ChurchOS',
        id: rpId(),
      },
      user: {
        id: userId,
        name: memberLabel.slice(0, 64) || 'member',
        displayName: memberLabel.slice(0, 64) || 'Member',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      timeout: 90_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Fingerprint enrollment was cancelled')

  return { credentialId: bufferToBase64Url(credential.rawId) }
}

export type AssertResult = {
  credentialId: string
}

/**
 * Prompt phone biometrics and match against enrolled member credentials.
 * Use the same phone that enrolled the fingerprints (door / kiosk device).
 */
export async function assertFingerprint(
  allowCredentialIds: string[],
): Promise<AssertResult> {
  if (!isWebAuthnAvailable()) {
    throw new Error('Open check-in in Safari on your iPhone to use Face ID / Touch ID.')
  }
  if (!allowCredentialIds.length) {
    throw new Error('No fingerprints enrolled yet. Register a member with fingerprint first.')
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: rpId(),
      allowCredentials: allowCredentialIds.map((id) => ({
        type: 'public-key' as const,
        id: base64UrlToBuffer(id),
        transports: ['internal'] as AuthenticatorTransport[],
      })),
      userVerification: 'required',
      timeout: 90_000,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error('Fingerprint scan was cancelled')

  return { credentialId: bufferToBase64Url(assertion.rawId) }
}
