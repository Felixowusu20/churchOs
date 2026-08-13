function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  cloudinaryUrl: required('CLOUDINARY_URL'),
  authSecret: process.env.AUTH_SECRET?.trim() || '',
  adminJwtSecret: required('ADMIN_JWT_SECRET'),
  openRegistration: (process.env.ADMIN_OPEN_REGISTRATION || 'true').toLowerCase() === 'true',
}
