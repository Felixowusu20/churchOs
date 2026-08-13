/** Digits-only phone for duplicate matching (ignores spaces, dashes, country formatting). */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function phonesMatch(a: string, b: string) {
  const left = normalizePhone(a)
  const right = normalizePhone(b)
  if (!left || !right) return false
  if (left === right) return true
  // Match when one includes a trailing local number of the other (e.g. +233… vs 0…)
  const shorter = left.length <= right.length ? left : right
  const longer = left.length > right.length ? left : right
  return shorter.length >= 9 && longer.endsWith(shorter)
}
