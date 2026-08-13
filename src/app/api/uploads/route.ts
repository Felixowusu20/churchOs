import { NextRequest } from 'next/server'
import { requireAdminId } from '@/lib/server/auth'
import { uploadBuffer } from '@/lib/server/cloudinary'
import { error, json } from '@/lib/server/http'

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return error('No image file provided')

    const folder = typeof form.get('folder') === 'string' ? String(form.get('folder')) : 'general'
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadBuffer(buffer, folder)
    return json({ url: result.url, publicId: result.publicId }, 201)
  } catch (err) {
    console.error(err)
    return error('Image upload failed', 500)
  }
}
