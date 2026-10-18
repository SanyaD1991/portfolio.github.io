const MAX_SIDE = 2000
const QUALITY = 0.82
const SKIP_TYPES = ['image/gif', 'image/svg+xml']

export type CompressResult = { file: File; before: number; after: number }

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
}

export async function compressImage(file: File): Promise<CompressResult> {
  const untouched = { file, before: file.size, after: file.size }
  if (!file.type.startsWith('image/') || SKIP_TYPES.includes(file.type)) return untouched

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return untouched
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await toBlob(canvas)
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return untouched

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`
    return { file: new File([blob], name, { type: 'image/webp' }), before: file.size, after: blob.size }
  } catch {
    return untouched
  }
}
