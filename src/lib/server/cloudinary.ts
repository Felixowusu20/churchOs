import { v2 as cloudinary } from 'cloudinary'
import { env } from './env'

process.env.CLOUDINARY_URL = env.cloudinaryUrl
cloudinary.config()

export { cloudinary }

export async function uploadBuffer(buffer: Buffer, folder: string, filename?: string) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `churchos/${folder}`,
        public_id: filename,
        resource_type: 'image',
        overwrite: true,
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error('Cloudinary upload failed'))
          return
        }
        resolve({ url: result.secure_url, publicId: result.public_id })
      },
    )
    stream.end(buffer)
  })
}
